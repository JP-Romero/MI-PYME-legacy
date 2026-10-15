/**
 * Reportes (solo Admin) — métricas del negocio + cuentas por cobrar (fiado).
 * El vendedor no llega aquí: la navegación y el render lo restringen,
 * y RLS en servidor ya limita lo que puede consultar.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { supabase } from '../lib/supabase';
import { listCredits } from '../lib/api';
import type { CreditAccount } from '../lib/types';
import { fmtNio, nioToUsd, fmtUsd } from '../lib/currency';

export default function Reports() {
  const { business, role } = useApp();
  const bizId = business!.id;
  const rate = business?.exchange_rate_nio_usd ?? 36.8;
  const [todayTotal, setTodayTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [credits, setCredits] = useState<CreditAccount[]>([]);

  useEffect(() => {
    if (role !== 'admin') return;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    // Filtro multi-tenant SIEMPRE presente + rango de fecha
    supabase.from('sales').select('total_nio')
      .eq('business_id', bizId)
      .eq('status', 'completed')
      .gte('created_at', since.toISOString())
      .then(({ data }) => {
        setCount(data?.length ?? 0);
        setTodayTotal((data ?? []).reduce((s: number, r: { total_nio: number }) => s + Number(r.total_nio), 0));
      });
    listCredits(bizId).then(setCredits);
  }, [bizId, role]);

  if (role !== 'admin')
    return <p className="p-8 text-center font-bold text-coral">🔒 Los reportes son solo para el Dueño/Administrador.</p>;

  const pending = credits.filter(c => c.status !== 'paid');
  const totalFiado = pending.reduce((s, c) => s + (c.amount_nio - c.paid_nio), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#F59E0B] via-[#F59E0B] to-[#EA580C] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight uppercase">Analítica y Métricas</h1>
          </div>
          <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full truncate max-w-[140px]">
            {business?.name || 'ANTRA POS'}
          </span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-3">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas Hoy</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{fmtNio(todayTotal)}</p>
            <p className="text-[10px] text-slate-400">{fmtUsd(nioToUsd(todayTotal, rate))}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tickets Emitidos</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{count}</p>
            <p className="text-[10px] text-slate-400">Total transacciones</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm col-span-2 border-l-4 border-l-amber-500">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Por Cobrar (Fiados)</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{fmtNio(totalFiado)}</p>
            <p className="text-[10px] text-slate-400">{pending.length} cuentas pendientes</p>
          </div>
        </section>

        {/* Cuentas por cobrar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
          <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            Detalle de Cuentas por Cobrar 🟡
          </h3>
          {pending.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Sin fiados pendientes 🎉</p>}
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white uppercase">{c.customer_name}</p>
                  <p className="text-[10px] text-slate-400">
                    Pagado {fmtNio(c.paid_nio)} de {fmtNio(c.amount_nio)}
                    {c.due_date ? ` · vence ${c.due_date}` : ''}
                  </p>
                </div>
                <span className="font-black text-sm text-[#EA580C]">{fmtNio(c.amount_nio - c.paid_nio)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
