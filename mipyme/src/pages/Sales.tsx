/**
 * Pestaña VENTAS — Historial de transacciones, reimpresión de tickets y envío WhatsApp.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { fetchRecentSales, type SaleRow } from '../lib/api';
import { fmtNio, fmtUsd } from '../lib/currency';
import { whatsappTicketUrl, printTicketAsPdf } from '../lib/ticket';

export default function Sales() {
  const { business } = useApp();
  const bizId = business?.id ?? 'demo';
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);

  useEffect(() => {
    fetchRecentSales(bizId).then((data) => {
      setSales(data ?? []);
    });
  }, [bizId]);

  const filteredSales = sales.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.folio.toLowerCase().includes(q) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
      String(s.total_nio).includes(q)
    );
  });

  const todaySales = sales.filter((s) => {
    const d = new Date(s.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const todayTotal = todaySales.reduce((acc, s) => acc + s.total_nio, 0);

  const getMethodBadge = (s: SaleRow) => {
    const m = s.payment_breakdown?.[0]?.method ?? 'efectivo_cordobas';
    switch (m) {
      case 'efectivo_cordobas':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">💵 Efectivo C$</span>;
      case 'efectivo_usd':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">💵 Dólares US$</span>;
      case 'transferencia':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">📲 Transferencia</span>;
      case 'tarjeta':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">💳 Tarjeta</span>;
      case 'fiado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🟡 Fiado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">{m}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#F59E0B] via-[#F59E0B] to-[#EA580C] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight uppercase">Historial de Ventas</h1>
          </div>
          <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
            {sales.length} ventas
          </span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-3">
        {/* KPI resumido de hoy */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas de Hoy</p>
            <p className="font-extrabold text-lg text-emerald-600 mt-0.5">{fmtNio(todayTotal)}</p>
            <p className="text-[10px] text-slate-400">{todaySales.length} comprobantes</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</p>
            <p className="font-extrabold text-lg text-slate-900 dark:text-white mt-0.5">
              {fmtNio(todaySales.length > 0 ? todayTotal / todaySales.length : 0)}
            </p>
            <p className="text-[10px] text-slate-400">Promedio general</p>
          </div>
        </div>

        {/* Buscador de ventas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio (#) o cliente..."
            className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>

        {/* Lista de ventas */}
        <div className="space-y-2.5">
          {filteredSales.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSale(s)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">#{s.folio}</span>
                    {getMethodBadge(s)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {new Date(s.created_at).toLocaleDateString('es-NI', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {s.customer_name && (
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      👤 {s.customer_name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black text-base text-slate-900 dark:text-white block">
                    {fmtNio(s.total_nio)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    {fmtUsd(s.total_usd)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredSales.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm font-semibold">No hay ventas registradas aún</p>
              <p className="text-xs mt-1">Realiza cobros desde la pantalla Vender</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle de venta */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setSelectedSale(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Folio #{selectedSale.folio}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedSale.created_at).toLocaleString('es-NI')}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Cliente</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSale.customer_name || 'Consumidor Final'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Estado</span>
                <span className="font-bold text-emerald-600 uppercase">{selectedSale.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Total Córdobas</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{fmtNio(selectedSale.total_nio)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Total Dólares</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{fmtUsd(selectedSale.total_usd)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const text = `TICKET #${selectedSale.folio}\nFecha: ${new Date(selectedSale.created_at).toLocaleString()}\nTotal: ${fmtNio(selectedSale.total_nio)}`;
                  printTicketAsPdf(text);
                }}
                className="w-full bg-[#0f172a] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95"
              >
                🖨️ Imprimir Ticket
              </button>
              <button
                onClick={() => {
                  const text = `Hola! Aquí está tu comprobante #${selectedSale.folio} de compra por ${fmtNio(selectedSale.total_nio)}. ¡Gracias por tu compra!`;
                  window.open(whatsappTicketUrl(undefined, text), '_blank');
                }}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95"
              >
                📲 Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
