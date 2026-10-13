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
    <main className="px-4 pb-32 pt-2">
      <h2 className="mb-3 text-xl font-black dark:text-white">📊 Reportes · {business?.name}</h2>

      {/* KPIs claymórficos */}
      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="clay-card">
          <p className="text-xs uppercase opacity-60 dark:text-white">Ventas hoy</p>
          <p className="text-2xl font-black text-mint">{fmtNio(todayTotal)}</p>
          <p className="text-[11px] opacity-60 dark:text-white">{fmtUsd(nioToUsd(todayTotal, rate))}</p>
        </div>
        <div className="clay-card">
          <p className="text-xs uppercase opacity-60 dark:text-white">Tickets hoy</p>
          <p className="text-2xl font-black text-orchid">{count}</p>
        </div>
        <div className="clay-card col-span-2 border-l-8 border-amber">
          <p className="text-xs uppercase opacity-60 dark:text-white">Por cobrar (fiado)</p>
          <p className="text-2xl font-black text-amber">{fmtNio(totalFiado)}</p>
        </div>
      </section>

      {/* Cuentas por cobrar */}
      <h3 className="mb-2 font-black dark:text-white">Cuentas por cobrar 🟡</h3>
      {pending.length === 0 && <p className="opacity-60 dark:text-white">Sin fiados pendientes. 🎉</p>}
      {pending.map(c => (
        <div key={c.id} className="clay-card mb-2 flex items-center justify-between py-3">
          <div>
            <p className="font-bold dark:text-white">{c.customer_name}</p>
            <p className="text-xs opacity-60 dark:text-white">
              Pagado {fmtNio(c.paid_nio)} de {fmtNio(c.amount_nio)}
              {c.due_date ? ` · vence ${c.due_date}` : ''}
            </p>
          </div>
          <span className="chip bg-amber text-carbon">{fmtNio(c.amount_nio - c.paid_nio)}</span>
        </div>
      ))}
    </main>
  );
}
