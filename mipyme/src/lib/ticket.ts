/**
 * MI PYME — Ticket / Recibo: genera texto plano para impresora térmica
 * Bluetooth (58mm/80mm) y enlace de envío por WhatsApp.
 */
import type { Business, CartItem, PaymentLine } from '../lib/types';
import { fmtNio, nioToUsd, fmtUsd } from '../lib/currency';

export interface TicketData {
  business: Business;
  items: CartItem[];
  totalNio: number;
  payments: PaymentLine[];
  changeNio: number;
  folio: string;
  sellerName: string;
}

/** Formato ESC/POS simplificado: texto alineado a 32 columnas (58mm). */
export function buildTicketText(t: TicketData): string {
  const W = 32;
  const line = '-'.repeat(W);
  const row = (l: string, r: string) => {
    const pad = Math.max(1, W - l.length - r.length);
    return `${l}${' '.repeat(pad)}${r}`;
  };
  const out: string[] = [];
  out.push(center(t.business.name.toUpperCase(), W));
  if (t.business.address) out.push(center(t.business.address, W));
  out.push(center(`Folio #${t.folio}`, W));
  out.push(center(new Date().toLocaleString('es-NI'), W));
  out.push(line);
  for (const it of t.items) {
    out.push(row(trunc(it.product.name, 16), `${fmtQty(it.qty)} x ${fmtNio(it.product.price_nio)}`));
    out.push(row('', fmtNio(it.qty * it.product.price_nio)));
  }
  out.push(line);
  out.push(row('TOTAL', fmtNio(t.totalNio)));
  out.push(row('TOTAL USD', fmtUsd(nioToUsd(t.totalNio, t.business.exchange_rate_nio_usd))));
  for (const p of t.payments) {
    out.push(row(label(p.method), p.currency === 'USD' ? fmtUsd(p.amount) : fmtNio(p.amount)));
  }
  if (t.changeNio > 0) out.push(row('CAMBIO', fmtNio(t.changeNio)));
  out.push(line);
  out.push(center(`Vendedor: ${t.sellerName}`, W));
  out.push(center('* MI PYME — Gracias por su compra *', W));
  return out.join('\n');
}

/** Enlace wa.me para enviar el ticket como mensaje (sin pagos en la app). */
export function whatsappTicketUrl(phone: string | undefined, text: string): string {
  const num = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/** Descarga el ticket como PDF simple usando window.print (Web/Capacitor WebView). */
export function printTicketAsPdf(text: string): void {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return;
  w.document.write(
    `<pre style="font-family:monospace;font-size:12px;width:280px;margin:0 auto">${escapeHtml(text)}</pre>` +
      `<script>window.onload=()=>{window.print()}</script>`,
  );
  w.document.close();
}

// ---------- helpers ----------
const center = (s: string, w: number) => s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(3).replace(/0+$/, ''));
const label = (m: string) =>
  ({ efectivo_cordobas: 'Efectivo C$', efectivo_usd: 'Efectivo US$', transferencia: 'Transferencia', tarjeta: 'Tarjeta', fiado: 'Fiado' }[m] ?? m);
const escapeHtml = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
