/**
 * Carrito flotante (Spatial UI): panel acrílico que flota sobre la grilla.
 */
import type { CartItem } from '../lib/types';
import { fmtNio, nioToUsd, fmtUsd } from '../lib/currency';

interface Props {
  items: CartItem[];
  rate: number;
  open: boolean;
  onToggle: () => void;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export default function FloatingCart({ items, rate, open, onToggle, onQty, onRemove, onCheckout }: Props) {
  const total = items.reduce((s, i) => s + i.qty * i.product.price_nio, 0);
  const count = items.reduce((s, i) => s + (Number.isInteger(i.qty) ? 1 : 1), 0);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      {open && (
        <div className="glass-panel mb-3 max-h-[55vh] overflow-y-auto p-4">
          <p className="mb-3 font-black dark:text-white">🛒 Carrito · {count} artículo{count !== 1 ? 's' : ''}</p>
          {items.length === 0 && <p className="text-sm opacity-60 dark:text-white">Escanea o toca productos para agregar.</p>}
          {items.map(({ product, qty }) => (
            <div key={product.id} className="mb-2 flex items-center gap-3 rounded-pill bg-white/60 dark:bg-white/5 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold dark:text-white">{product.name}</p>
                <p className="text-xs opacity-60 dark:text-white">{fmtNio(product.price_nio)} c/u</p>
              </div>
              {/* Stepper táctil grande */}
              <button onClick={() => onQty(product.id, -1)} className="h-10 w-10 rounded-full shadow-clay-inset font-black text-lg active:scale-90">−</button>
              <span className="w-8 text-center font-black dark:text-white">{qty}</span>
              <button onClick={() => onQty(product.id, +1)} className="h-10 w-10 rounded-full bg-mint font-black text-lg active:scale-90">+</button>
              <button onClick={() => onRemove(product.id)} className="text-coral font-bold">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Barra de cobro siempre visible — CTA Acid Mint */}
      <button
        onClick={items.length ? onCheckout : onToggle}
        className="btn-mint w-full flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-carbon text-mint text-sm font-black">{items.length}</span>
          {items.length ? 'COBRAR' : 'Ver carrito'}
        </span>
        <span className="text-right leading-tight">
          <span className="block text-xl font-black">{fmtNio(total)}</span>
          <span className="block text-[11px] opacity-70">{fmtUsd(nioToUsd(total, rate))}</span>
        </span>
      </button>
    </div>
  );
}
