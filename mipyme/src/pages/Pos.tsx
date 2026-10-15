/**
 * Pantalla VENDER (POS) — Diseño fiel a ANTRA POS:
 * Header dorado/ámbar con estatus en línea, escáner, ajustes y botón de carrito C$0.00.
 * Buscador con escáner, chips de categorías ("Todos", "Agua", "Aguardientes", "Cerveza"),
 * y grilla de 2 columnas con tarjetas de productos, insignia de stock verde ("X disponibles"),
 * precio en Córdobas (C$) y botón oscuro "+".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';
import { useApp } from '../hooks/useApp';
import { fetchProducts, fetchCategories, findByBarcode, recordSale, getOpenRegister } from '../lib/api';
import type { Product, Category, SalePayload, PaymentLine } from '../lib/types';
import { fmtNio, nioToUsd, fmtUsd } from '../lib/currency';
import { buildTicketText, whatsappTicketUrl, printTicketAsPdf } from '../lib/ticket';
import PaymentModal from '../components/PaymentModal';
import { useCart } from '../hooks/useCart';

// Productos de muestra idénticos a los de la captura para cuando la base de datos esté vacía
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    business_id: 'demo',
    name: 'ADAN Y EVA FRUTOS ROJOS',
    price_nio: 60,
    cost_nio: 45,
    stock: 4,
    unit: 'u',
    is_active: true,
    category_id: 'cat-aguardientes',
  },
  {
    id: 'demo-2',
    business_id: 'demo',
    name: 'AGUA BRISA BOLSA (500 ML)',
    price_nio: 6,
    cost_nio: 3,
    stock: 32,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-3',
    business_id: 'demo',
    name: 'AGUA BRISA BOTELLA (500 ML)',
    price_nio: 14,
    cost_nio: 8,
    stock: 27,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-4',
    business_id: 'demo',
    name: 'AGUA CIELO FRESA KIWI (650 ML)',
    price_nio: 20,
    cost_nio: 12,
    stock: 12,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-5',
    business_id: 'demo',
    name: 'AGUA CIELO LIMÓN (650 ML)',
    price_nio: 20,
    cost_nio: 12,
    stock: 8,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-6',
    business_id: 'demo',
    name: 'AGUA FUENTE PURA (1 LT)',
    price_nio: 33,
    cost_nio: 22,
    stock: 13,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-7',
    business_id: 'demo',
    name: 'AGUA FUENTE PURA (1.5 LT)',
    price_nio: 42,
    cost_nio: 28,
    stock: 18,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-8',
    business_id: 'demo',
    name: 'AGUA FUENTE PURA (600 ML)',
    price_nio: 18,
    cost_nio: 11,
    stock: 25,
    unit: 'u',
    is_active: true,
    category_id: 'cat-agua',
  },
  {
    id: 'demo-9',
    business_id: 'demo',
    name: 'CERVEZA TOÑA (350 ML)',
    price_nio: 45,
    cost_nio: 32,
    stock: 24,
    unit: 'u',
    is_active: true,
    category_id: 'cat-cerveza',
  },
  {
    id: 'demo-10',
    business_id: 'demo',
    name: 'CERVEZA VICTORIA CLASICA',
    price_nio: 45,
    cost_nio: 32,
    stock: 16,
    unit: 'u',
    is_active: true,
    category_id: 'cat-cerveza',
  },
  {
    id: 'demo-11',
    business_id: 'demo',
    name: 'FLOR DE CAÑA 4 AÑOS (750 ML)',
    price_nio: 220,
    cost_nio: 160,
    stock: 6,
    unit: 'u',
    is_active: true,
    category_id: 'cat-aguardientes',
  },
  {
    id: 'demo-12',
    business_id: 'demo',
    name: 'RON PLATINO (1 LT)',
    price_nio: 160,
    cost_nio: 120,
    stock: 10,
    unit: 'u',
    is_active: true,
    category_id: 'cat-aguardientes',
  },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-agua', business_id: 'demo', name: 'Agua', color: '#3b82f6' },
  { id: 'cat-aguardientes', business_id: 'demo', name: 'Aguardientes', color: '#f59e0b' },
  { id: 'cat-cerveza', business_id: 'demo', name: 'Cerveza', color: '#10b981' },
];

interface PosProps {
  cartState?: ReturnType<typeof useCart>;
  onOpenSettings?: () => void;
}

export default function Pos({ cartState, onOpenSettings }: PosProps) {
  const { business, user, online, businesses, switchBusiness, signOut } = useApp();
  const bizId = business?.id ?? 'demo';
  const rate = business?.exchange_rate_nio_usd ?? 36.8;

  const fallbackCart = useCart();
  const { items: cart, addProduct, changeQty, removeItem, clearCart, totalNio: total } = cartState ?? fallbackCart;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('todos');
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanningRef = useRef(false);

  // Carga productos y categorías reales, con fallback elegante a la demo
  useEffect(() => {
    let active = true;
    Promise.all([fetchProducts(bizId), fetchCategories(bizId)]).then(([pList, cList]) => {
      if (!active) return;
      if (pList && pList.length > 0) {
        setProducts(pList);
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }
      if (cList && cList.length > 0) {
        setCategories(cList);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    });
    return () => {
      active = false;
    };
  }, [bizId]);

  // Lista de categorías para los chips horizontales
  const categoryChips = useMemo(() => {
    const list = [{ id: 'todos', name: 'Todos' }];
    categories.forEach((c) => {
      if (!list.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
        list.push({ id: c.id, name: c.name });
      }
    });
    return list;
  }, [categories]);

  // Filtrado por buscador y categoría
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products;

    // Filtro por categoría seleccionada
    if (selectedCat !== 'todos') {
      const catObj = categories.find((c) => c.id === selectedCat);
      const catName = catObj ? catObj.name.toLowerCase() : selectedCat.toLowerCase();
      list = list.filter((p) => {
        if (p.category_id === selectedCat) return true;
        // Búsqueda inteligente por nombre de producto si no coincide category_id
        return p.name.toLowerCase().includes(catName);
      });
    }

    // Filtro por texto o código
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
    }

    return list;
  }, [products, query, selectedCat, categories]);

  const handleAdd = (p: Product) => {
    addProduct(p);
    setNotice(`+ ${p.name}`);
    setTimeout(() => setNotice(null), 1200);
  };

  /** Escáner por cámara: BarcodeDetector nativo o Web fallback */
  const scan = async () => {
    if ('BarcodeDetector' in window && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const det = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] });
        scanningRef.current = true;
        const tick = async () => {
          if (!scanningRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          try {
            const codes = await det.detect(v);
            if (codes.length) {
              stopScan(stream);
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame aún no listo */
          }
          requestAnimationFrame(tick);
        };
        tick();
        return;
      } catch {
        /* sin permisos de cámara web */
      }
    }

    try {
      await Camera.getPhoto({ resultType: CameraResultType.Uri, quality: 60 });
      const code = prompt('Ingresa el código de barras del producto:');
      if (code) onDetected(code.trim());
    } catch {
      setNotice('Escáner no disponible');
      setTimeout(() => setNotice(null), 2000);
    }
  };

  const stopScan = (stream?: MediaStream) => {
    scanningRef.current = false;
    (stream ?? (videoRef.current?.srcObject as MediaStream))?.getTracks?.().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const onDetected = async (barcode: string) => {
    const p = (await findByBarcode(bizId, barcode)) ?? products.find((x) => x.barcode === barcode);
    if (p) {
      handleAdd(p);
    } else {
      setNotice(`No se encontró producto con código: ${barcode}`);
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const confirmSale = async (lines: PaymentLine[], customerName?: string) => {
    setPaying(false);
    const reg = await getOpenRegister(bizId);
    const paid = lines.filter((l) => l.method !== 'fiado').length;
    const sale: SalePayload = {
      business_id: bizId,
      register_id: reg?.id ?? null,
      folio: String(Date.now()).slice(-6),
      total_nio: total,
      total_usd: total / rate,
      payment_breakdown: lines,
      change_nio: Math.max(0, paid ? total : 0),
      status: lines.some((l) => l.method === 'fiado') ? 'fiado' : 'completed',
      customer_name: customerName ?? null,
      exchange_rate: rate,
      items: cart.map((i) => ({
        product_id: i.product.id,
        name_snapshot: i.product.name,
        qty: i.qty,
        unit_price_nio: i.product.price_nio,
        line_total_nio: i.qty * i.product.price_nio,
      })),
    };

    const res = await recordSale(bizId, sale);
    setNotice(res.offline ? 'Venta guardada offline · se sincronizará 🔄' : 'Venta registrada ✓');
    clearCart();
    setCartOpen(false);

    const ticketText = buildTicketText({
      business: business ?? {
        id: 'demo',
        name: 'ANTRA POS',
        owner_id: '',
        industry: 'abarrotes',
        currency_default: 'NIO',
        exchange_rate_nio_usd: rate,
        low_stock_threshold: 5,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      items: sale.items.map((i) => ({
        product: { price_nio: i.unit_price_nio, name: i.name_snapshot } as Product,
        qty: i.qty,
      })),
      totalNio: total,
      payments: lines,
      changeNio: sale.change_nio,
      folio: sale.folio,
      sellerName: user?.email ?? 'Vendedor',
    });

    setTimeout(() => setTicket(ticketText), 500);
    setTimeout(() => setNotice(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20 select-none">
      {/* ===== HEADER ESTILO ANTRA POS ===== */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#F59E0B] via-[#F59E0B] to-[#EA580C] px-3.5 pt-3 pb-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Logo / Tienda + Nombre + Estado */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Botón icono de tienda */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#EA580C] active:scale-95 transition-transform shrink-0"
              title="Información y tiendas"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l1-6h16l1 6" />
                <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
                <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
              </svg>
            </button>

            {/* Texto de Negocio y Estado en línea */}
            <div className="min-w-0">
              <h1 className="font-extrabold text-slate-900 text-[15px] sm:text-base leading-tight tracking-tight uppercase truncate">
                {business?.name || 'ANTRA POS'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-semibold text-slate-900/80">
                  {online ? 'En línea (PC)' : 'Modo Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones del Header: Cámara, Ajustes y Carrito C$ */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botón Cámara / Escáner */}
            <button
              onClick={scan}
              className="w-9 h-9 bg-white/95 hover:bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
              title="Escanear código"
            >
              <svg className="w-5 h-5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>

            {/* Botón Ajustes */}
            <button
              onClick={() => (onOpenSettings ? onOpenSettings() : setSettingsOpen(true))}
              className="w-9 h-9 bg-white/95 hover:bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
              title="Ajustes"
            >
              <svg className="w-5 h-5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {/* Botón Carrito Azul Marino C$0.00 */}
            <button
              onClick={() => setCartOpen(true)}
              className="bg-[#0f172a] hover:bg-slate-900 active:scale-95 text-white rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-sm transition-transform"
              title="Ver Carrito y Cobrar"
            >
              <svg className="w-4 h-4 text-[#fbbf24]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2.5 3h3.2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.8a1.8 1.8 0 0 0 1.8-1.4l1.8-7.7H6.2" />
              </svg>
              <span className="font-extrabold text-[13px] sm:text-sm text-white tracking-tight">
                {fmtNio(total)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Vista de la cámara durante escaneo */}
      {scanningRef.current && (
        <div className="bg-black/90 p-3 relative max-w-md mx-auto">
          <video ref={videoRef} className="h-44 w-full object-cover rounded-xl border-2 border-emerald-400" muted playsInline />
          <button
            onClick={() => stopScan()}
            className="absolute top-5 right-5 bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md"
          >
            ✕ Cancelar
          </button>
        </div>
      )}
      {!scanningRef.current && <video ref={videoRef} className="hidden" />}

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <div className="max-w-md mx-auto">
        {/* Buscador de productos + botón de cámara */}
        <section className="px-3.5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-amber-500/40 transition-all">
              <svg className="w-5 h-5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto o código..."
                className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium text-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1">
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={scan}
              className="w-11 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-transform shrink-0"
              title="Escanear"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>
        </section>

        {/* Chips de Categorías horizontales */}
        <section className="px-3.5 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
          {categoryChips.map((chip) => {
            const isSelected = selectedCat === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCat(chip.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#1c1917] text-[#fbbf24] shadow-sm'
                    : 'bg-[#f1f5f9] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {chip.name}
              </button>
            );
          })}
        </section>

        {/* ===== GRILLA DE PRODUCTOS (2 COLUMNAS) ===== */}
        <section className="px-3.5 pb-24 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((p) => {
            const lowStock = p.stock <= 0;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  {/* Nombre del producto en Mayúsculas */}
                  <h3 className="font-extrabold text-[13px] leading-tight text-slate-900 dark:text-white uppercase line-clamp-2 min-h-[2.1rem]">
                    {p.name}
                  </h3>

                  {/* Insignia de stock verde suave */}
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        lowStock
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950/70 dark:text-emerald-400'
                      }`}
                    >
                      {lowStock ? 'Agotado' : `${p.stock} disponibles`}
                    </span>
                  </div>
                </div>

                {/* Fila inferior: Precio y botón "+" oscuro */}
                <div className="mt-3 flex items-center justify-between pt-1">
                  <span className="font-extrabold text-[15px] text-slate-900 dark:text-white tracking-tight">
                    {fmtNio(p.price_nio)}
                  </span>
                  <button
                    onClick={() => handleAdd(p)}
                    className="w-8 h-8 rounded-lg bg-[#0f172a] hover:bg-slate-800 active:scale-90 text-white flex items-center justify-center font-bold text-lg transition-transform shadow-sm"
                    title={`Agregar ${p.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}

          {shown.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm font-semibold">No se encontraron productos</p>
              <p className="text-xs mt-1">Prueba con otra palabra o categoría</p>
            </div>
          )}
        </section>
      </div>

      {/* ===== AVISO TOAST FLOTANTE ===== */}
      {notice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a]/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-bounce">
          {notice}
        </div>
      )}

      {/* ===== MODAL / DRAWER DEL CARRITO ===== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setCartOpen(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛒</span>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Carrito de Venta</h2>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Lista de productos */}
              <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-4xl mb-2">🛍️</p>
                    <p className="text-sm font-semibold">El carrito está vacío</p>
                    <p className="text-xs">Toca en "+" para agregar productos</p>
                  </div>
                )}
                {cart.map(({ product, qty }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate uppercase">{product.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {fmtNio(product.price_nio)} c/u
                      </p>
                    </div>

                    {/* Stepper de cantidad */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => changeQty(product.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 font-bold flex items-center justify-center active:scale-90"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold text-xs text-slate-900 dark:text-white">{qty}</span>
                      <button
                        onClick={() => changeQty(product.id, 1)}
                        className="w-7 h-7 rounded-lg bg-[#0f172a] text-white font-bold flex items-center justify-center active:scale-90"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center font-bold text-sm ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales y Botón Cobrar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Equivalente USD</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{fmtUsd(nioToUsd(total, rate))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Total a Cobrar</span>
                <span className="font-black text-xl text-[#EA580C]">{fmtNio(total)}</span>
              </div>
              <button
                disabled={cart.length === 0}
                onClick={() => {
                  setCartOpen(false);
                  setPaying(true);
                }}
                className="w-full bg-[#16a34a] hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-base shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>COBRAR</span>
                <span>{fmtNio(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE PAGO MIXTO ===== */}
      {paying && (
        <PaymentModal
          totalNio={total}
          rate={rate}
          onClose={() => setPaying(false)}
          onConfirm={confirmSale}
        />
      )}

      {/* ===== MODAL DE AJUSTES RÁPIDOS / MULTITIENDA ===== */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Tiendas y Ajustes</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis Negocios</p>
              {businesses.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold">{business?.name || 'ANTRA POS'}</p>
                  <p className="text-[11px] opacity-70">Modo local activo</p>
                </div>
              ) : (
                businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBusiness(b);
                      setSettingsOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                      b.id === business?.id ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <span>🏪 {b.name}</span>
                    {b.id === business?.id && <span className="text-emerald-600 font-extrabold">✓ Activo</span>}
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500">{user?.email || 'vendedor@antrapas.com'}</span>
              <button
                onClick={signOut}
                className="bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE TICKET / COMPROBANTE ===== */}
      {ticket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md grid place-items-center p-4" onClick={() => setTicket(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Comprobante de Venta</h3>
              <button onClick={() => setTicket(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <pre className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap border border-slate-200 dark:border-slate-800 mb-4">
              {ticket}
            </pre>
            <div className="space-y-2">
              <button
                onClick={() => printTicketAsPdf(ticket)}
                className="w-full bg-[#0f172a] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95"
              >
                🖨️ Imprimir / Guardar PDF
              </button>
              <button
                onClick={() => window.open(whatsappTicketUrl(undefined, ticket), '_blank')}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95"
              >
                📲 Enviar por WhatsApp
              </button>
              <button
                onClick={() => setTicket(null)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs"
              >
                Listo / Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
