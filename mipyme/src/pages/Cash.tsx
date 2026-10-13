/**
 * Gestión de Caja — apertura, arqueo y cierre de caja chica.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { getOpenRegister, openRegister, closeRegister } from '../lib/api';
import type { CashRegister } from '../lib/types';
import { fmtNio } from '../lib/currency';

export default function Cash() {
  const { business } = useApp();
  const bizId = business!.id;
  const [reg, setReg] = useState<CashRegister | null>(null);
  const [fund, setFund] = useState('');
  const [count, setCount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => getOpenRegister(bizId).then(setReg);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [bizId]);

  const open = async () => {
    const r = await openRegister(bizId, parseFloat(fund || '0'));
    if (r) { setReg(r); setFund(''); flash('Caja abierta ✓'); }
  };

  const close = async () => {
    // Arqueo: fondo + ventas del turno (aprox. desde el servidor al sincronizar)
    const physical = parseFloat(count || '0');
    await closeRegister(bizId, reg!.id, physical, reg!.opening_fund);
    setReg(null); setCount('');
    flash(`Cierre · físico ${fmtNio(physical)} vs esperado ${fmtNio(reg!.opening_fund)}`);
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };

  return (
    <main className="px-4 pb-32 pt-2">
      <h2 className="mb-3 text-xl font-black dark:text-white">💰 Caja Chica</h2>

      {!reg ? (
        <div className="clay-card grid gap-3">
          <p className="dark:text-white">No hay caja abierta en <b>{business?.name}</b>.</p>
          <input className="clay-input" inputMode="decimal" placeholder="Fondo inicial C$ (ej. 500)" value={fund} onChange={e => setFund(e.target.value)} />
          <button onClick={open} disabled={!fund} className="btn-mint disabled:opacity-50">🔓 Abrir caja</button>
        </div>
      ) : (
        <>
          <div className="clay-card mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60 dark:text-white">Caja abierta</p>
              <p className="font-black text-mint">{fmtNio(reg.opening_fund)}</p>
            </div>
            <span className="chip bg-mint/20 dark:text-mint">● activa desde {new Date(reg.opened_at).toLocaleTimeString('es-NI')}</span>
          </div>

          <div className="clay-card grid gap-3">
            <p className="font-bold dark:text-white">Arqueo y cierre</p>
            <input className="clay-input" inputMode="decimal" placeholder="Conteo físico en cajón C$" value={count} onChange={e => setCount(e.target.value)} />
            <button onClick={close} disabled={!count} className="btn-coral disabled:opacity-50">🔒 Cerrar caja con arqueo</button>
          </div>
        </>
      )}

      {msg && <div className="glass-panel fixed left-1/2 top-20 z-[70] -translate-x-1/2 px-5 py-2 font-bold dark:text-white">{msg}</div>}
    </main>
  );
}
