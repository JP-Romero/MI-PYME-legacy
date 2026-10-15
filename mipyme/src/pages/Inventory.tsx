/**
 * Inventario & Catálogo Pro — CRUD completo, filtros, stock y márgenes.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { fetchProducts, fetchCategories, upsertProduct } from '../lib/api';
import type { Product, Category } from '../lib/types';
import { fmtNio } from '../lib/currency';

export default function Inventory() {
  const { business, role } = useApp();
  const bizId = business!.id;
  const isAdmin = role === 'admin';

  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  
  // Form state para crear / editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', barcode: '', price: '', cost: '', stock: '', unit: 'u', category_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [pList, cList] = await Promise.all([fetchProducts(bizId), fetchCategories(bizId)]);
    setItems(pList);
    setCategories(cList);
  };

  useEffect(() => { load(); }, [bizId]);

  const lowStock = items.filter(p => p.stock <= (business?.low_stock_threshold ?? 5));

  const filteredItems = items.filter(p => {
    const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) || (p.barcode && p.barcode.includes(query));
    const matchCat = selectedCat === 'all' || p.category_id === selectedCat;
    return matchQuery && matchCat;
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', barcode: '', price: '', cost: '', stock: '10', unit: 'u', category_id: categories[0]?.id ?? '' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      barcode: p.barcode ?? '',
      price: String(p.price_nio),
      cost: String(p.cost_nio ?? 0),
      stock: String(p.stock),
      unit: p.unit ?? 'u',
      category_id: p.category_id ?? '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.price) return;
    const ok = await upsertProduct(bizId, {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price_nio: parseFloat(form.price),
      cost_nio: isAdmin ? parseFloat(form.cost || '0') : 0,
      stock: parseFloat(form.stock || '0'),
      unit: form.unit as Product['unit'],
      category_id: form.category_id || null,
      is_active: true,
    });
    setMsg(ok ? 'Producto guardado exitosamente ✓' : 'Guardado offline · sincronizando 🔄');
    setShowForm(false);
    setTimeout(() => { setMsg(null); load(); }, 1200);
  };

  const remove = async (p: Product) => {
    if (!confirm(`¿Eliminar o desactivar "${p.name}"?`)) return;
    await upsertProduct(bizId, { id: p.id, name: p.name, price_nio: p.price_nio, stock: p.stock, is_active: false });
    load();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#F59E0B] via-[#F59E0B] to-[#EA580C] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight uppercase">Catálogo e Inventario</h1>
          </div>
          <button
            onClick={openNew}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition-transform"
          >
            + Nuevo
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-3">
        {msg && <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl text-center shadow-sm">{msg}</div>}

      {/* Buscador y Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código de barras..."
          className="clay-input flex-1"
        />
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="clay-input sm:w-48"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Alerta de Stock Bajo */}
      {lowStock.length > 0 && (
        <div className="clay-card mb-4 border-l-8 border-coral">
          <p className="font-black text-coral">⚠ Alerta de Stock Bajo ({lowStock.length} productos)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map(p => (
              <span key={p.id} className="chip bg-coral/20 text-coral text-xs">
                {p.name}: <b>{p.stock}{p.unit}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal / Formulario flotante de Creación o Edición */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-header/60 backdrop-blur-md p-4">
          <div className="clay-card w-full max-w-lg p-6 bg-sheet dark:bg-header">
            <h3 className="mb-4 text-xl font-black text-carbon dark:text-white">
              {editingId ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
            </h3>
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Nombre del Producto o Servicio</label>
                <input className="clay-input" placeholder="Ej. Corte Clásico / Arroz 5lb" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-secondary mb-1 block">Código de Barras (EAN)</label>
                  <input className="clay-input" placeholder="Opcional" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1 block">Unidad de Medida</label>
                  <select className="clay-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    <option value="u">Unidad (u)</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="lt">Litro (lt)</option>
                    <option value="serv">Servicio / Hora</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-secondary mb-1 block">Precio de Venta (C$)</label>
                  <input className="clay-input" inputMode="decimal" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                {isAdmin && (
                  <div>
                    <label className="text-xs font-bold text-secondary mb-1 block">Costo (C$)</label>
                    <input className="clay-input" inputMode="decimal" placeholder="0.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-secondary mb-1 block">Stock Actual</label>
                  <input className="clay-input" inputMode="decimal" placeholder="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1 block">Categoría</label>
                  <select className="clay-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={save} className="btn-mint flex-1 py-3">Guardar Producto</button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-5 py-3">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listado de Productos */}
      <div className="grid gap-3">
        {filteredItems.map(p => {
          const isLow = p.stock <= (business?.low_stock_threshold ?? 5);
          return (
            <div key={p.id} className="clay-card flex items-center justify-between p-4 transition-all hover:scale-[1.01]">
              <div className="min-w-0 pr-4 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-carbon dark:text-white truncate">{p.name}</p>
                  {isLow && <span className="chip bg-coral/20 text-coral text-[10px] px-2 py-0.5">Bajo stock</span>}
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  {p.barcode ? `EAN: ${p.barcode} · ` : ''} Stock: <b className="text-carbon dark:text-white">{p.stock} {p.unit}</b>
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-lg font-black text-mint">{fmtNio(p.price_nio)}</p>
                  {isAdmin && <p className="text-[11px] text-secondary">Margen: {margin(p)}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="chip bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1.5" title="Editar">✏️</button>
                  <button onClick={() => remove(p)} className="chip bg-coral/20 hover:bg-coral/30 text-xs px-2.5 py-1.5 text-coral" title="Desactivar">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="clay-card py-12 text-center">
            <p className="text-lg font-bold text-secondary">No se encontraron productos en el inventario.</p>
            <button onClick={openNew} className="btn-mint mt-3 text-sm">Agregar el primer producto</button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}

const margin = (p: Product) =>
  p.price_nio > 0 && p.cost_nio ? `${(((p.price_nio - p.cost_nio) / p.price_nio) * 100).toFixed(0)}%` : '—';
