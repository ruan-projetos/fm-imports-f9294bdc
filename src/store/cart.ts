import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string | null;
  color: string | null;
  size: string | null;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxStock) }
                  : i,
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      remove: (variantId) =>
        set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "fm-cart-v1" },
  ),
);

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
