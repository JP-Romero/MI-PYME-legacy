/**
 * POS / TPV — Grilla de productos, escáner por cámara y carrito flotante.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';
import { useApp } from '../hooks/useApp';
import { fetchProducts, findByBarcode, recordSale, getOpenRegister } from '../lib/api';
import type { Product, CartItem, SalePayload, PaymentLine } from '../lib/types';
import { fmtNio } from '../lib/currency';
import { buildTicketText, whatsappTicketUrl, printTicketAsPdf } from '../lib/ticket';
import FloatingCart from '../components/FloatingCart';
import PaymentModal from '../components/PaymentModal';

export default function Pos() {
  const { business, user } = useApp();
  const bizId = business!.id;
  const rate = business?.exchange_rate_nio_usd ?? 36.8;

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => { fetchProducts(bizId).then(setProducts); }, [bizId]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? products.filter(p => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)) : products;
    return list.slice(0, 120); // rendimiento en móviles de gama baja
  }, [products, query]);

  const addProduct = (p: Product) => {
    setCart(c => {
      const i = c.findIndex(x => x.product.id === p.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { product: p, qty: 1 }];
    });
    setNotice(`+ ${p.name}`); setTimeout(() => setNotice(null), 1200);
  };

  const changeQty = (id: string, d: number) =>
    setCart(c => c.map(x => x.product.id === id ? { ...x, qty: Math.max(0.001, x.qty + d) } : x));
  const removeItem = (id: string) => setCart(c => c.filter(x => x.product.id !== id));

  /** Escáner por cámara: BarcodeDetector (Chrome/Android WebView) con fallback a foto OCR-less. */
  const scan = async () => {
    if ('BarcodeDetector' in window && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const v = videoRef.current!;
        v.srcObject = stream; await v.play();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const det = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] });
        scanningRef.current = true;
        const tick = async () => {
          if (!scanningRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
          try {
            const codes = await det.detect(v);
            if (codes.length) { stopScan(stream); onDetected(codes[0].rawValue); return; }
          } catch { /* frame aún no listo */ }
          requestAnimationFrame(tick);
        };
        tick();
        return;
      } catch { /* sin permisos/cámara web -> fallback nativo */ }
    }
    // Fallback Capacitor: captura fotograma y pide el código manualmente
    try {
      // Se captura la foto solo como referencia; el monto se ingresa a mano.
      await Camera.getPhoto({ resultType: CameraResultType.Uri, quality: 60 });
      const code = prompt('Lee el código de barras visible en la foto e ingrésalo:');
      if (code) onDetected(code.trim());
    } catch { setNotice('Escáner no disponible en este dispositivo.'); }
  };

  const stopScan = (stream?: MediaStream) => {
    scanningRef.current = false;
    (stream ?? (videoRef.current?.srcObject as MediaStream))?.getTracks?.().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const onDetected = async (barcode: string) => {
    const p = await findByBarcode(bizId, barcode);
    if (p) addProduct(p); else setNotice(`Sin producto para ${barcode} — agrégalo en Inventario`);
    setTimeout(() => setNotice(null), 2500);
  };

  const total = cart.reduce((s, i) => s + i.qty * i.product.price_nio, 0);

  const confirmSale = async (lines: PaymentLine[], customerName?: string) => {
    setPaying(false);
    const reg = await getOpenRegister(bizId);
    const paid = lines.filter(l => l.method !== 'fiado').length;
    const sale: SalePayload = {
      business_id: bizId,                      // <- aislamiento multi-tenant garantizado
      register_id: reg?.id ?? null,
      folio: String(Date.now()).slice(-6),
      total_nio: total,
      total_usd: total / rate,
      payment_breakdown: lines,
      change_nio: Math.max(0, paid ? total : 0),
      status: lines.some(l => l.method === 'fiado') ? 'fiado' : 'completed',
      customer_name: customerName ?? null,
      exchange_rate: rate,
      items: cart.map(i => ({
        product_id: i.product.id, name_snapshot: i.product.name,
        qty: i.qty, unit_price_nio: i.product.price_nio, line_total_nio: i.qty * i.product.price_nio,
      })),
    };
    const res = await recordSale(bizId, sale);
    setNotice(res.offline ? 'Venta guardada offline · se sincronizará 🔄' : 'Venta registrada ✓');
    setCart([]); setCartOpen(false);
    // Ticket
    const text = buildTicketText({ business: business!, items: sale.items.map(i => ({ product: { price_nio: i.unit_price_nio, name: i.name_snapshot } as Product, qty: i.qty })), totalNio: total, payments: lines, changeNio: sale.change_nio, folio: sale.folio, sellerName: user?.email ?? '' });
    setTimeout(() => showTicket(text), 800);
    setTimeout(() => setNotice(null), 2500);
  };

  const [ticket, setTicket] = useState<string | null>(null);
  const showTicket = (t: string) => setTicket(t);

  return (
    <main className="px-4 pb-32 pt-2">
      {/* Buscador + escáner */}
      <div className="mb-3 flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar producto…" className="clay-input" />
        <button onClick={scan} className="btn-orchid shrink-0 px-5" title="Escanear código de barras">📷</button>
      </div>

      {/* Vista del escáner */}
      {scanningRef.current && (
        <div className="glass-panel mb-3 overflow-hidden">
          <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
          <button onClick={() => stopScan()} className="btn-coral absolute right-6 top-52 px-4 py-2 text-sm">Cancelar</button>
        </div>
      )}
      {!scanningRef.current && <video ref={videoRef} className="hidden" />}

      {/* Aviso */}
      {notice && <div className="glass-panel fixed left-1/2 top-20 z-[70] -translate-x-1/2 px-5 py-2 font-bold dark:text-white">{notice}</div>}

        <section className="spatial-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 p-2">
        {shown.map(p => {
          const low = p.stock <= (business?.low_stock_threshold ?? 5);
          return (
            <button key={p.id} onClick={() => addProduct(p)}
              className="clay-card relative text-left transition-all hover:-translate-y-2 hover:shadow-float min-h-[140px] flex flex-col justify-between">
              {low && <span className="absolute right-3 top-3 chip bg-coral text-white text-xs">⚠ {p.stock}</span>}
              <div>
                <p className="font-bold leading-tight text-carbon dark:text-white">{p.name}</p>
                <p className="mt-1 text-xs opacity-60 dark:text-carbon/60 dark:text-white/60">{p.unit === 'u' ? '' : `por ${p.unit} · `}Stock: {p.stock}</p>
              </div>
              <p className="mt-2 text-xl font-black text-mint">{fmtNio(p.price_nio)}</p>
            </button>
          );
        })}
        {shown.length === 0 && <p className="col-span-full mt-10 text-center opacity-60 dark:text-white">Sin productos todavía. Agrega en 📦 Inventario.</p>}
      </section>

      {/* Carrito flotante (Spatial UI) */}
      <FloatingCart items={cart} rate={rate} open={cartOpen}
        onToggle={() => setCartOpen(o => !o)} onQty={changeQty} onRemove={removeItem}
        onCheckout={() => { setCartOpen(false); setPaying(true); }} />

      {/* Modal de pago mixto */}
      {paying && <PaymentModal totalNio={total} rate={rate} onClose={() => setPaying(false)} onConfirm={confirmSale} />}

      {/* Modal de ticket: Bluetooth / WhatsApp / PDF */}
      {ticket && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-carbon/40 backdrop-blur-md p-4" onClick={() => setTicket(null)}>
          <div className="glass-panel max-h-[80vh] w-full max-w-sm overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <pre className="mb-4 whitespace-pre-wrap font-mono text-xs dark:text-white">{ticket}</pre>
            <div className="grid gap-2">
              <button className="btn-mint" onClick={() => printTicketAsPdf(ticket)}>🖨️ Imprimir / PDF</button>
              <button className="btn-orchid" onClick={() => window.open(whatsappTicketUrl(undefined, ticket), '_blank')}>📲 Enviar por WhatsApp</button>
              <button className="btn-ghost dark:text-white" onClick={() => setTicket(null)}>Cerrar</button>
            </div>
            <p className="mt-2 text-center text-[11px] opacity-60 dark:text-white">Para impresoras térmicas: empareja tu impresora Bluetooth en Ajustes del dispositivo.</p>
          </div>
        </div>
      )}
    </main>
  );
}
