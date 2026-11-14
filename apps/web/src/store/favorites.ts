import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { authFetch } from '@/lib/auth';
import type { Paginated } from '@/lib/types';
import type { ProductType } from './cart';

/** Товар в избранном: всё, что нужно для карточки без запроса к каталогу. */
export interface FavoriteItem {
  type: ProductType;
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
  price: number;
  /** Остаток для книги (из каталога или API избранного); у аудиокниги нет */
  stock?: number;
  /** false — товар снят с продажи (известно после входа) */
  isAvailable?: boolean;
}

interface ServerFavorite {
  product: {
    type: ProductType;
    id: string;
    slug: string;
    title: string;
    author: string;
    coverUrl: string | null;
    price: number;
    isAvailable: boolean;
    inStock: boolean | null;
  };
}

interface FavoritesState {
  items: FavoriteItem[];
  mode: 'guest' | 'server';
  toggle: (item: FavoriteItem) => void;
  remove: (type: ProductType, id: string) => void;
  has: (type: ProductType, id: string) => boolean;
  attach: () => Promise<void>;
  detach: () => void;
}

const same = (item: { type: ProductType; id: string }, type: ProductType, id: string) =>
  item.type === type && item.id === id;

const productBody = (item: { type: ProductType; id: string }) =>
  item.type === 'BOOK' ? { bookId: item.id } : { audiobookId: item.id };

const deletePath = (item: { type: ProductType; id: string }) =>
  `/users/me/favorites/${item.type === 'BOOK' ? 'books' : 'audiobooks'}/${item.id}`;

async function loadServerFavorites(): Promise<FavoriteItem[]> {
  const all: FavoriteItem[] = [];
  for (let page = 1; page <= 20; page++) {
    const result = await authFetch<Paginated<ServerFavorite>>(
      `/users/me/favorites?limit=50&page=${page}`,
    );
    all.push(
      ...result.data.map(({ product }) => ({
        type: product.type,
        id: product.id,
        slug: product.slug,
        title: product.title,
        author: product.author,
        coverUrl: product.coverUrl,
        price: product.price,
        stock: product.inStock === false ? 0 : undefined,
        isAvailable: product.isAvailable,
      })),
    );
    if (page >= result.meta.totalPages) break;
  }
  return all;
}

/**
 * Избранное. У гостя — в браузере; после входа переносится в аккаунт
 * (/users/me/favorites) и синхронизируется между устройствами.
 */
export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      mode: 'guest',

      toggle: (item) => {
        if (get().has(item.type, item.id)) return get().remove(item.type, item.id);
        const before = get().items;
        set({ items: [item, ...before] });
        if (get().mode === 'server') {
          authFetch('/users/me/favorites', {
            method: 'POST',
            body: JSON.stringify(productBody(item)),
          }).catch(() => set({ items: before }));
        }
      },

      remove: (type, id) => {
        const before = get().items;
        set({ items: before.filter((item) => !same(item, type, id)) });
        if (get().mode === 'server') {
          authFetch(deletePath({ type, id }), { method: 'DELETE' }).catch(() =>
            set({ items: before }),
          );
        }
      },

      has: (type, id) => get().items.some((item) => same(item, type, id)),

      attach: async () => {
        const { mode, items } = get();
        if (mode === 'guest' && items.length > 0) {
          // Добавление идемпотентно: уже избранное на сервере не дублируется
          await Promise.allSettled(
            items.map((item) =>
              authFetch('/users/me/favorites', {
                method: 'POST',
                body: JSON.stringify(productBody(item)),
              }),
            ),
          );
        }
        set({ items: await loadServerFavorites(), mode: 'server' });
      },

      detach: () => set({ items: [], mode: 'guest' }),
    }),
    {
      name: 'oku24-favorites',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({ items: state.items, mode: state.mode }),
      // v1 хранила только ключи «BOOK:id» без данных товара — показать их нельзя
      migrate: () => ({ items: [], mode: 'guest' }) as never,
    },
  ),
);
