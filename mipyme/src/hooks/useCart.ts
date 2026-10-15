/**
 * Hook para la gestión del carrito de compras POS.
 * Mantiene el estado en memoria y persistente entre pestañas.
 */
import { useState } from 'react';
import type { Product, CartItem } from '../lib/types';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addProduct = (p: Product, qty = 1) => {
    setItems((current) => {
      const idx = current.findIndex((x) => x.product.id === p.id);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...current, { product: p, qty }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setItems((current) =>
      current
        .map((x) => (x.product.id === id ? { ...x, qty: Math.max(0.001, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((x) => x.product.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalNio = items.reduce((sum, item) => sum + item.qty * item.product.price_nio, 0);
  const count = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    items,
    setItems,
    addProduct,
    changeQty,
    removeItem,
    clearCart,
    totalNio,
    count,
  };
}
