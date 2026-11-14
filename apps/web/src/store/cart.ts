import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ProductType = 'BOOK' | 'AUDIOBOOK';

export interface GuestCartItem {
  type: ProductType;
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  /** Цена на момент добавления, тыйын. Итоговую сумму всегда считает сервер */
  price: number;
  quantity: number;
  /** Остаток на складе на момент добавления — больше положить нельзя (сервер перепроверяет) */
  stock?: number;
}

const MAX_QUANTITY = 99;

interface CartState {
  items: GuestCartItem[];
  add: (item: Omit<GuestCartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (type: ProductType, id: string, quantity: number) => void;
  remove: (type: ProductType, id: string) => void;
  clear: () => void;
}

/**
 * Корзина гостя — в браузере. После входа она переносится на сервер
 * (POST /cart/merge), где проверяются цены и наличие.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.type === item.type && i.id === item.id);
          if (existing) {
            // Аудиокнига — всегда одна
            const limit = Math.min(MAX_QUANTITY, item.stock ?? existing.stock ?? MAX_QUANTITY);
            const next =
              item.type === 'AUDIOBOOK' ? 1 : Math.min(limit, existing.quantity + quantity);
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, ...item, quantity: next } : i,
              ),
            };
          }
          const limit = Math.min(MAX_QUANTITY, item.stock ?? MAX_QUANTITY);
          const first = item.type === 'AUDIOBOOK' ? 1 : Math.max(1, Math.min(limit, quantity));
          return { items: [...state.items, { ...item, quantity: first }] };
        }),
      setQuantity: (type, id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.type === type && i.id === id
              ? {
                  ...i,
                  quantity:
                    type === 'AUDIOBOOK'
                      ? 1
                      : Math.max(1, Math.min(MAX_QUANTITY, i.stock ?? MAX_QUANTITY, quantity)),
                }
              : i,
          ),
        })),
      remove: (type, id) =>
        set((state) => ({ items: state.items.filter((i) => !(i.type === type && i.id === id)) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'oku24-cart', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export const cartCount = (items: GuestCartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);
