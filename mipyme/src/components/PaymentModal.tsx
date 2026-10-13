/**
 * Modal de Pagos Mixtos y Multimoneda (C$ / US$ / Transferencia / Fiado).
 * Flota con fondo desenfocado (Spatial UI) sobre la grilla del POS.
 */
import { useState } from 'react';
import type { PaymentLine, PaymentMethod } from '../lib/types';
import { fmtNio, fmtUsd, nioToUsd, paidTotalNio, changeNio } from '../lib/currency';

interface Props {
  totalNio: number;
  rate: number;                 // tasa C$/USD del negocio
  onClose: () => void;
  onConfirm: (lines: PaymentLine[], customerName?: string) => void;
}

const METHODS: { m: PaymentMethod; label: string; cur: 'NIO' | 'USD' }[] = [
  { m: 'efectivo_cordobas', label: '💵 Efectivo C$', cur: 'NIO' },
  { m: 'efectivo_usd',      label: '💵 Dólares US$', cur: 'USD' },
  { m: 'transferencia',     label: '📲 Transferencia', cur: 'NIO' },
  { m: 'tarjeta',           label: '💳 Tarjeta', cur: 'NIO' },
];

export default function PaymentModal({ totalNio, rate, onClose, onConfirm }: Props) {
  const [lines, setLines] = useState<PaymentLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('efectivo_cordobas');
  const [amount, setAmount] = useState<string>(String(totalNio));
  const [fiado, setFiado] = useState(false);
  const [customer, setCustomer] = useState('');

  const paid = paidTotalNio(lines, rate);
  const remaining = Math.max(0, totalNio - paid);
  const change = changeNio(totalNio, lines, rate);
  const covered = remaining <= 0.009 || fiado;

  const addLine = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const cur = method === 'efectivo_usd' ? 'USD' : 'NIO';
    setLines(l => [...l, { method, currency: cur, amount: amt }]);
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-carbon/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="glass-panel w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-black dark:text-white">Pago mixto</h2>
        <p className="mb-4 text-sm opacity-70 dark:text-white">
          Total: <b>{fmtNio(totalNio)}</b> · <b>{fmtUsd(nioToUsd(totalNio, rate))}</b> @ C${rate.toFixed(2)}/US$
        </p>

        {/* Métodos como píldoras grandes */}
        <div className="mb-3 flex flex-wrap gap-2">
          {METHODS.map(x => (
            <button key={x.m} onClick={() => { setMethod(x.m); setAmount(String(x.cur === 'USD' ? nioToUsd(remaining, rate).toFixed(2) : remaining.toFixed(2))); }}
              className={`chip ${method === x.m ? 'bg-orchid text-white' : 'dark:text-white'}`}>{x.label}</button>
          ))}
          <button onClick={() => setFiado(f => !f)} className={`chip ${fiado ? 'bg-amber text-carbon' : 'dark:text-white'}`}>🟡 Fiado</button>
        </div>

        {!fiado && (
          <div className="mb-3 flex gap-2">
            <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
              placeholder={method === 'efectivo_usd' ? 'Monto US$' : 'Monto C$'} className="clay-input" />
            <button onClick={addLine} className="btn-orchid shrink-0 px-5">Agregar</button>
          </div>
        )}

        {fiado && (
          <input value={customer} onChange={e => setCustomer(e.target.value)}
            placeholder="Nombre del cliente (fiado)" className="clay-input mb-3" />
        )}

        {/* Líneas agregadas */}
        {lines.map((l, i) => (
          <div key={i} className="mb-1 flex items-center justify-between rounded-pill bg-white/60 dark:bg-white/5 px-4 py-2 text-sm dark:text-white">
            <span>{METHODS.find(x => x.m === l.method)?.label ?? l.method}</span>
            <span className="flex items-center gap-2 font-bold">
              {l.currency === 'USD' ? fmtUsd(l.amount) : fmtNio(l.amount)}
              <button className="text-coral" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}>✕</button>
            </span>
          </div>
        ))}

        <div className="my-3 grid grid-cols-2 gap-2 text-sm font-bold dark:text-white">
          <div className="rounded-clay shadow-clay-inset p-3">Falta: <span className={remaining > 0 ? 'text-coral' : 'text-mint'}>{fmtNio(remaining)}</span></div>
          <div className="rounded-clay shadow-clay-inset p-3">Cambio: <span className="text-mint">{fmtNio(change)}</span></div>
        </div>

        <button disabled={!covered}
          onClick={() => onConfirm(fiado && remaining > 0 ? [...lines, { method: 'fiado', currency: 'NIO', amount: remaining }] : lines, customer || undefined)}
          className={`w-full ${covered ? 'btn-mint' : 'btn-ghost opacity-50'}`}>
          ✓ Confirmar cobro
        </button>
      </div>
    </div>
  );
}
