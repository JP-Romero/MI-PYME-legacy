/**
 * MI PYME — Acceso a datos (Supabase + fallback offline)
 * REGLA DE ORO: toda consulta incluye .eq('business_id', ...) para
 * garantizar el aislamiento multi-tenant en cliente y servidor (RLS).
 */
import { supabase } from './supabase';
import {
  localStore, keys, enqueue, setSyncApplier, syncPendingOps, queueSize, type QueuedOp,
} from './offline';
import type { Business, Category, Product, SalePayload, CashRegister, CreditAccount, PaymentLine } from './types';

// ---------- Autenticación ----------
export const auth = {
  async signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  },
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() { return supabase.auth.signOut(); },
  currentUser() { return supabase.auth.getUser().then(r => r.data.user); },
};

// ---------- Negocios (tenants) ----------
export async function createBusiness(userId: string, data: Pick<Business, 'name' | 'industry'> & Partial<Business>): Promise<Business | null> {
  let row: Business | null = null;
  try {
    const { data: resData, error } = await supabase
      .from('businesses')
      .insert({ ...data, owner_id: userId })
      .select().single();
    if (!error && resData) {
      row = resData as Business;
    } else if (error) {
      console.warn('Supabase RLS/Error (403 or similar), falling back to local business:', error.message);
    }
  } catch (e) {
    console.warn('Supabase offline or error, creating business locally:', e);
  }

  if (!row) {
    row = {
      id: crypto.randomUUID(),
      owner_id: userId,
      currency_default: 'NIO',
      exchange_rate_nio_usd: 36.8,
      low_stock_threshold: 5,
      logo_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      ...data,
    } as Business;
    await enqueue(row.id, { entity: 'business', op: 'insert', payload: row });
  }

  const cached = await localStore.get<Business[]>(keys.myBusinesses(userId), []);
  if (!cached.some(b => b.id === row!.id)) {
    await localStore.set(keys.myBusinesses(userId), [...cached, row]);
  }

  return row;
}

export async function listMyBusinesses(userId: string): Promise<Business[]> {
  try {
    const { data, error } = await supabase
      .from('business_members')
      .select('role, businesses(*)')
      .eq('user_id', userId);
    if (!error && data && data.length > 0) {
      const list = data.map(d => ({ ...(d.businesses as unknown as Business), _role: d.role }) as Business);
      await localStore.set(keys.myBusinesses(userId), list);
      return list;
    }
  } catch {
    // offline
  }
  return localStore.get<Business[]>(keys.myBusinesses(userId), []);
}

// ---------- Catálogo ----------
export async function fetchProducts(businessId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('is_active', true)
    .order('name');
  if (error || !data) {
    // Offline: servir caché local del negocio
    return localStore.get<Product[]>(keys.productsCache(businessId), []);
  }
  await localStore.set(keys.productsCache(businessId), data); // alimentar caché
  return data as Product[];
}

export async function fetchCategories(businessId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories').select('*')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .order('name');
  if (error || !data) return localStore.get<Category[]>(keys.categoriesCache(businessId), []);
  await localStore.set(keys.categoriesCache(businessId), data);
  return data as Category[];
}

export async function upsertProduct(businessId: string, p: Partial<Product> & { name: string }): Promise<boolean> {
  const payload = { ...p, business_id: businessId }; // business_id SIEMPRE inyectado
  const { error } = await supabase.from('products').upsert(payload);
  if (error) {
    await enqueue(businessId, { entity: 'product', op: 'insert', payload });
    return false; // quedó en cola offline
  }
  return true;
}

export async function findByBarcode(businessId: string, barcode: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products').select('*')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('barcode', barcode).maybeSingle();
  if (data) return data as Product;
  // Fallback offline: buscar en caché local
  const cache = await localStore.get<Product[]>(keys.productsCache(businessId), []);
  return cache.find(x => x.barcode === barcode) ?? null;
}

// ---------- Caja ----------
export async function getOpenRegister(businessId: string): Promise<CashRegister | null> {
  const { data } = await supabase
    .from('cash_registers').select('*')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('status', 'open').order('opened_at').limit(1).maybeSingle();
  return (data as CashRegister) ?? null;
}

export async function openRegister(businessId: string, openingFund: number): Promise<CashRegister | null> {
  const { data, error } = await supabase
    .from('cash_registers')
    .insert({ business_id: businessId, opening_fund: openingFund, status: 'open' })
    .select().single();
  return error ? null : (data as CashRegister);
}

export async function closeRegister(businessId: string, id: string, closingCount: number, expected: number): Promise<void> {
  await supabase
    .from('cash_registers')
    .update({ status: 'closed', closing_count: closingCount, expected_amount: expected, closed_at: new Date().toISOString() })
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('id', id);
}

// ---------- Ventas ----------
export async function recordSale(businessId: string, sale: SalePayload): Promise<{ ok: boolean; offline: boolean }> {
  const { items, ...head } = sale;
  const { data, error } = await supabase
    .from('sales').insert({ ...head, business_id: businessId }).select().single();
  if (error || !data) {
    await enqueue(businessId, { entity: 'sale', op: 'insert', payload: sale });
    return { ok: false, offline: true };
  }
  const rows = items.map(i => ({ ...i, business_id: businessId, sale_id: (data as { id: string }).id }));
  const { error: e2 } = await supabase.from('sale_items').insert(rows);
  if (e2) await enqueue(businessId, { entity: 'sale', op: 'insert', payload: sale });

  // Guardar en caché de ventas recientes
  const recentCache = await localStore.get<SaleRow[]>(`recent_sales_${businessId}`, []);
  const newRow: SaleRow = {
    id: (data as { id?: string })?.id ?? crypto.randomUUID(),
    folio: sale.folio,
    total_nio: sale.total_nio,
    total_usd: sale.total_usd,
    status: sale.status,
    payment_breakdown: sale.payment_breakdown,
    created_at: new Date().toISOString(),
    customer_name: sale.customer_name ?? null,
  };
  await localStore.set(`recent_sales_${businessId}`, [newRow, ...recentCache.slice(0, 49)]);

  // Descontar stock localmente en caché (optimista)
  const cache = await localStore.get<Product[]>(keys.productsCache(businessId), []);
  for (const it of items) {
    const idx = cache.findIndex(p => p.id === it.product_id);
    if (idx >= 0) cache[idx] = { ...cache[idx], stock: Number((cache[idx].stock - it.qty).toFixed(3)) };
  }
  await localStore.set(keys.productsCache(businessId), cache);
  return { ok: !e2, offline: false };
}

// ---------- Fiados ----------
export async function listCredits(businessId: string): Promise<CreditAccount[]> {
  const { data } = await supabase
    .from('credit_accounts').select('*')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .neq('status', 'paid').order('created_at', { ascending: false });
  return (data as CreditAccount[]) ?? [];
}

/** Registra una cuenta de fiado (crédito por cobrar). */
export async function createCredit(businessId: string, c: Omit<CreditAccount, 'id' | 'business_id' | 'status'>): Promise<boolean> {
  const payload = { ...c, business_id: businessId, status: 'pending' as const }; // <- tenant inyectado
  const { error } = await supabase.from('credit_accounts').insert(payload);
  if (error) { await enqueue(businessId, { entity: 'credit_account', op: 'insert', payload }); return false; }
  return true;
}

/** Abona un pago a una cuenta de fiado (crédito). Actualiza paid_nio y status. */
export async function payCredit(businessId: string, id: string, currentPaidNio: number, paymentNio: number, amountNio: number): Promise<boolean> {
  const newPaid = Math.round((currentPaidNio + paymentNio + Number.EPSILON) * 100) / 100;
  const status = newPaid >= amountNio ? 'paid' : 'pending';
  const payload = { paid_nio: newPaid, status };
  const { error } = await supabase
    .from('credit_accounts')
    .update(payload)
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('id', id);
  if (error) {
    await enqueue(businessId, { entity: 'credit_account', op: 'update', payload: { id, ...payload, business_id: businessId } });
    return false;
  }
  return true;
}

// ---------- Movimientos de caja (ingresos/egresos manuales) ----------
export interface CashMovementInput {
  register_id?: string | null;
  type: 'in' | 'out';
  amount_nio: number;
  reason?: string | null;
}

export async function addCashMovement(businessId: string, m: CashMovementInput): Promise<boolean> {
  const payload = { ...m, business_id: businessId }; // <- tenant inyectado
  const { error } = await supabase.from('cash_movements').insert(payload);
  if (error) { await enqueue(businessId, { entity: 'cash_movement', op: 'insert', payload }); return false; }
  return true;
}

export async function listCashMovements(businessId: string, registerId: string): Promise<{ id: string; type: 'in' | 'out'; amount_nio: number; reason: string | null; created_at: string }[]> {
  const { data } = await supabase
    .from('cash_movements').select('id,type,amount_nio,reason,created_at')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .eq('register_id', registerId)
    .order('created_at', { ascending: false });
  return (data as never[]) ?? [];
}

// ---------- Ventas (consultas para reportes) ----------
export interface SaleRow {
  id: string; folio: string; total_nio: number; total_usd: number;
  status: string; payment_breakdown: PaymentLine[]; created_at: string;
  customer_name: string | null;
}

/** Ventas de un rango de fechas, siempre filtradas por tenant. */
export async function fetchSalesInRange(businessId: string, fromIso: string, toIso: string): Promise<SaleRow[]> {
  const { data } = await supabase
    .from('sales')
    .select('id,folio,total_nio,total_usd,status,payment_breakdown,created_at,customer_name')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .neq('status', 'void')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: false });
  return (data as SaleRow[]) ?? [];
}

/** Obtiene las ventas recientes del negocio activo con caché local. */
export async function fetchRecentSales(businessId: string, limit = 50): Promise<SaleRow[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('id,folio,total_nio,total_usd,status,payment_breakdown,created_at,customer_name')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data && data.length > 0) {
      await localStore.set(`recent_sales_${businessId}`, data);
      return data as SaleRow[];
    }
  } catch {
    // offline
  }
  return localStore.get<SaleRow[]>(`recent_sales_${businessId}`, []);
}

/** Ítems vendidos en un rango (para top productos). Se apoya en la tabla sale_items. */
export async function fetchTopProducts(businessId: string, fromIso: string, toIso: string): Promise<{ name: string; qty: number; total_nio: number }[]> {
  const { data } = await supabase
    .from('sale_items')
    .select('name_snapshot,qty,line_total_nio,sales!inner(created_at,business_id)')
    .eq('business_id', businessId)   // <- aislamiento multi-tenant
    .gte('sales.created_at', fromIso)
    .lte('sales.created_at', toIso);
  if (!data) return [];
  const map = new Map<string, { name: string; qty: number; total_nio: number }>();
  for (const r of data as unknown as { name_snapshot: string; qty: number; line_total_nio: number }[]) {
    const cur = map.get(r.name_snapshot) ?? { name: r.name_snapshot, qty: 0, total_nio: 0 };
    cur.qty += Number(r.qty); cur.total_nio += Number(r.line_total_nio);
    map.set(r.name_snapshot, cur);
  }
  return [...map.values()].sort((a, b) => b.total_nio - a.total_nio).slice(0, 8);
}

// ---------- Sincronización offline-first ----------
/** Reenvía la cola local del negocio al recuperar conexión. */
export const syncPending = (businessId: string) => syncPendingOps(businessId);

/** Operaciones pendientes de sincronizar en el dispositivo. */
export const pendingCount = (businessId: string) => queueSize(businessId);

/** Aplica una operación encolada según su entidad. */
async function applyQueuedOp(businessId: string, op: QueuedOp): Promise<boolean> {
  const p = op.payload as Record<string, unknown>;
  try {
    switch (op.entity) {
      case 'sale': {
        const { items, ...head } = p as unknown as SalePayload;
        const { data, error } = await supabase.from('sales').insert({ ...head, business_id: businessId }).select('id').single();
        if (error || !data) return false;
        const rows = (items ?? []).map(i => ({ ...i, business_id: businessId, sale_id: (data as { id: string }).id }));
        const { error: e2 } = await supabase.from('sale_items').insert(rows);
        return !e2;
      }
      case 'product': {
        const { error } = await supabase.from('products').upsert({ ...p, business_id: businessId });
        return !error;
      }
      case 'cash_register': {
        const { error } = await supabase.from('cash_registers').insert({ ...p, business_id: businessId });
        return !error;
      }
      case 'cash_movement': {
        const { error } = await supabase.from('cash_movements').insert({ ...p, business_id: businessId });
        return !error;
      }
      case 'credit_account': {
        if (op.op === 'update' && typeof p.id === 'string') {
          const { id, ...rest } = p;
          const { error } = await supabase.from('credit_accounts').update(rest).eq('business_id', businessId).eq('id', id);
          return !error;
        }
        const { error } = await supabase.from('credit_accounts').insert({ ...p, business_id: businessId });
        return !error;
      }
      case 'business': {
        const { error } = await supabase.from('businesses').upsert(p);
        return !error;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Registra el aplicador en el módulo offline (se ejecuta al importar api.ts). */
setSyncApplier(applyQueuedOp);
