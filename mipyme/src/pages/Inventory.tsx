/**
 * Inventario (solo Admin ve costos/márgenes) — CRUD de productos con
 * alertas de stock bajo. Toda escritura inyecta business_id.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { fetchProducts, upsertProduct } from '../lib/api';
import type { Product } from '../lib/types';
import { fmtNio } from '../lib/currency';

export default function Inventory() {
  const { business, role } = useApp();
  const bizId = business!.id;
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', barcode: '', price: '', cost: '', stock: '', unit: 'u' });
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => fetchProducts(bizId).then(setItems);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [bizId]);

  const lowStock = items.filter(p => p.stock <= (business?.low_stock_threshold ?? 5));

  const save = async () => {
    if (!form.name || !form.price) return;
    const ok = await upsertProduct(bizId, {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price_nio: parseFloat(form.price),
      cost_nio: isAdmin ? parseFloat(form.cost || '0') : 0, // costo solo para admin
      stock: parseFloat(form.stock || '0'),
      unit: form.unit as Product['unit'],
    });
    setMsg(ok ? 'Producto guardado ✓' : 'Sin conexión: en cola offline 🔄');
    setForm({ name: '', barcode: '', price: '', cost: '', stock: '', unit: 'u' });
    setTimeout(() => { setMsg(null); load(); }, 1600);
  };

  return (
    <main className="px-4 pb-32 pt-2">
      <h2 className="mb-3 text-xl font-black dark:text-white">📦 Inventario {!isAdmin && <span className="text-xs opacity-60">(modo vendedor)</span>}</h2>

      {/* Alta rápida de producto */}
      <div className="clay-card mb-4 grid gap-2">
        <input className="clay-input" placeholder="Nombre del producto" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="clay-input" placeholder="Código de barras" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
          <select className="clay-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
            <option value="u">Unidad</option><option value="kg">Kilogramo</option><option value="lt">Litro</option>
          </select>
          <input className="clay-input" inputMode="decimal" placeholder="Precio venta C$" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          {isAdmin && <input className="clay-input" inputMode="decimal" placeholder="Costo C$" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />}
          <input className="clay-input" inputMode="decimal" placeholder="Stock" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
        </div>
        <button onClick={save} className="btn-mint">Agregar al catálogo</button>
        {msg && <p className="text-center text-sm font-bold text-mint">{msg}</p>}
      </div>

      {/* Alerta de stock bajo */}
      {lowStock.length > 0 && (
        <div className="clay-card mb-4 border-l-8 border-coral">
          <p className="font-black text-coral">⚠ Bajo inventario ({lowStock.length})</p>
          <ul className="mt-1 text-sm dark:text-white">
            {lowStock.slice(0, 6).map(p => <li key={p.id}>{p.name}: <b>{p.stock}{p.unit}</b></li>)}
          </ul>
        </div>
      )}

      {/* Listado */}
      <div className="grid gap-2">
        {items.map(p => (
          <div key={p.id} className="clay-card flex items-center justify-between py-3">
            <div className="min-w-0">
              <p className="truncate font-bold dark:text-white">{p.name}</p>
              <p className="text-xs opacity-60 dark:text-white">{p.barcode ? `EAN ${p.barcode} · ` : ''}Stock {p.stock}{p.unit}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-mint">{fmtNio(p.price_nio)}</p>
              {isAdmin && <p className="text-[11px] opacity-60 dark:text-white">Margen: {margin(p)}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const margin = (p: Product) =>
  p.price_nio > 0 ? `${(((p.price_nio - p.cost_nio) / p.price_nio) * 100).toFixed(0)}%` : '—';
