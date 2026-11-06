import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ProductType } from './cart';

interface FavoritesState {
  keys: string[];
  toggle: (type: ProductType, id: string) => void;
  has: (type: ProductType, id: string) => boolean;
}

const key = (type: ProductType, id: string) => `${type}:${id}`;

/**
 * Избранное гостя — в браузере. После входа синхронизируется с
 * POST /users/me/favorites (этап личного кабинета).
 */
export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      keys: [],
      toggle: (type, id) =>
        set((state) => ({
          keys: state.keys.includes(key(type, id))
            ? state.keys.filter((k) => k !== key(type, id))
            : [...state.keys, key(type, id)],
        })),
      has: (type, id) => get().keys.includes(key(type, id)),
    }),
    { name: 'oku24-favorites', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
