/**
 * MI PYME — Almacenamiento local offline-first (Capacitor Preferences)
 * Fallback cuando no hay internet: catálogo en caché + cola de operaciones.
 */
import { Preferences } from '@capacitor/preferences';

const PREFIX = 'mipyme:';

export const localStore = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const { value } = await Preferences.get({ key: PREFIX + key });
    if (value == null) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  },
  async set(key: string, data: unknown): Promise<void> {
    await Preferences.set({ key: PREFIX + key, value: JSON.stringify(data) });
  },
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key: PREFIX + key });
  },

  /** Claves locales con un prefijo (auditoría/limpieza). */
  async keysWithPrefix(prefix: string): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys.filter(k => k.startsWith(PREFIX + prefix)).map(k => k.slice(PREFIX.length));
  },
};

/** Claves por negocio: el aislamiento multi-tenant también aplica al cache local */
export const keys = {
  sessionBusiness: (userId: string) => `session:${userId}:business`,
  productsCache: (businessId: string) => `cache:${businessId}:products`,
  categoriesCache: (businessId: string) => `cache:${businessId}:categories`,
  syncQueue: (businessId: string) => `queue:${businessId}:pending`,
};

export interface QueuedOp {
  id: string;
  entity: 'sale' | 'product' | 'cash_register' | 'credit_account' | 'cash_movement';
  op: 'insert' | 'update' | 'delete';
  payload: unknown;
  createdAt: number;
}

/** Encola una operación offline para sincronizarla después. */
export async function enqueue(businessId: string, item: Omit<QueuedOp, 'id' | 'createdAt'>): Promise<void> {
  const k = keys.syncQueue(businessId);
  const q = await localStore.get<QueuedOp[]>(k, []);
  q.push({ ...item, id: crypto.randomUUID(), createdAt: Date.now() });
  await localStore.set(k, q);
}

/** Extrae y limpia la pendiente de sincronización. */
export async function drainQueue(businessId: string): Promise<QueuedOp[]> {
  const k = keys.syncQueue(businessId);
  const q = await localStore.get<QueuedOp[]>(k, []);
  await localStore.set(k, []);
  return q;
}

/** Reintroduce operaciones que fallaron al sincronizar. */
export async function requeue(businessId: string, items: QueuedOp[]): Promise<void> {
  const k = keys.syncQueue(businessId);
  const q = await localStore.get<QueuedOp[]>(k, []);
  await localStore.set(k, [...items, ...q]);
}

/** Número de operaciones pendientes en la cola local del negocio. */
export async function queueSize(businessId: string): Promise<number> {
  return (await localStore.get<QueuedOp[]>(keys.syncQueue(businessId), [])).length;
}

/**
 * Sincroniza la cola offline de un negocio contra Supabase.
 * Se apoya en callbacks inyectados (re-exportado desde api.ts para evitar
 * ciclos de importación). Devuelve cuántas operaciones se subieron con éxito.
 */
export type SyncApplier = (businessId: string, op: QueuedOp) => Promise<boolean>;

let syncApplier: SyncApplier | null = null;
let syncing = false;

/** Registra el aplicador de operaciones (llamado una vez desde api.ts). */
export function setSyncApplier(fn: SyncApplier) { syncApplier = fn; }

export async function syncPendingOps(businessId: string): Promise<number> {
  if (!syncApplier || syncing) return 0;
  const pending = await drainQueue(businessId);
  if (pending.length === 0) return 0;
  syncing = true;
  const failed: QueuedOp[] = [];
  let done = 0;
  try {
    for (const op of pending) {
      const ok = await syncApplier(businessId, op).catch(() => false);
      if (ok) done++; else failed.push(op);
    }
  } finally {
    syncing = false;
  }
  if (failed.length) await requeue(businessId, failed);
  return done;
}
