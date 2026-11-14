import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { authFetch } from '@/lib/auth';

export type ProductType = 'BOOK' | 'AUDIOBOOK';

/** Проблема позиции, из-за которой её нельзя заказать (так же называет их API). */
export type CartIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'ALREADY_OWNED';

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
  /** id позиции в корзине на сервере (после входа) */
  lineId?: string;
  issues?: CartIssue[];
  /** Прежняя цена, если с момента добавления она изменилась */
  previousPrice?: number;
}

type ProductInput = Omit<GuestCartItem, 'quantity' | 'lineId' | 'issues' | 'previousPrice'>;

/** Ответ API /cart. */
export interface ServerCart {
  items: {
    id: string;
    quantity: number;
    issues: CartIssue[];
    product: {
      type: ProductType;
      id: string;
      slug: string;
      title: string;
      author: string;
      coverUrl: string | null;
      price: number;
      stockQuantity: number | null;
    };
  }[];
}

export const MAX_QUANTITY = 99;

interface CartState {
  items: GuestCartItem[];
  /** guest — корзина в браузере; server — корзина аккаунта (здесь её копия) */
  mode: 'guest' | 'server';
  add: (item: ProductInput, quantity?: number) => void;
  setQuantity: (type: ProductType, id: string, quantity: number) => void;
  remove: (type: ProductType, id: string) => void;
  clear: () => void;
  /** Сервер ответил ошибкой — сообщение для покупателя */
  lastError: CartError | null;
  dismissError: () => void;
  /** Вход: перенести гостевую корзину в аккаунт (или просто загрузить корзину аккаунта) */
  attach: () => Promise<{ skipped: number }>;
  /** Выход: корзина аккаунта остаётся на сервере, в браузере — пусто */
  detach: () => void;
  /** Гость: обновить цены и наличие из каталога */
  refreshGuest: () => Promise<void>;
}

export type CartError = 'stock' | 'network';

const same = (item: { type: ProductType; id: string }, type: ProductType, id: string) =>
  item.type === type && item.id === id;

const limitFor = (item: { type: ProductType; stock?: number }) =>
  item.type === 'AUDIOBOOK' ? 1 : Math.min(MAX_QUANTITY, item.stock ?? MAX_QUANTITY);

/** Пересчёт «на складе меньше» после изменения количества; остальные проблемы остаются. */
function stockIssues(item: GuestCartItem, quantity: number): CartIssue[] | undefined {
  if (!item.issues || item.stock === undefined) return item.issues;
  const rest = item.issues.filter((issue) => issue !== 'INSUFFICIENT_STOCK');
  return item.stock > 0 && quantity > item.stock ? [...rest, 'INSUFFICIENT_STOCK'] : rest;
}

export function fromServer(cart: ServerCart, previous: GuestCartItem[] = []): GuestCartItem[] {
  return cart.items.map((line) => {
    const before = previous.find((item) => same(item, line.product.type, line.product.id));
    return {
      type: line.product.type,
      id: line.product.id,
      slug: line.product.slug,
      title: line.product.title,
      author: line.product.author,
      coverUrl: line.product.coverUrl,
      price: line.product.price,
      quantity: line.quantity,
      stock: line.product.stockQuantity ?? undefined,
      lineId: line.id,
      issues: line.issues,
      previousPrice:
        before && before.price !== line.product.price
          ? (before.previousPrice ?? before.price)
          : before?.previousPrice,
    };
  });
}

const productBody = (item: { type: ProductType; id: string }) =>
  item.type === 'BOOK' ? { bookId: item.id } : { audiobookId: item.id };

/**
 * Корзина. У гостя хранится в браузере; после входа переносится в аккаунт
 * (POST /cart/merge) и дальше живёт на сервере, а здесь — её копия для мгновенного
 * отклика. Цены и наличие при оформлении всегда проверяет сервер.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      /** Изменение на сервере: сразу показываем результат, потом сверяем с ответом API. */
      const sync = async (request: () => Promise<ServerCart>, rollback: GuestCartItem[]) => {
        try {
          const cart = await request();
          set({ items: fromServer(cart, get().items) });
        } catch (error) {
          set({
            items: rollback,
            lastError:
              error instanceof ApiRequestError && error.status === 409 ? 'stock' : 'network',
          });
          // Корзина на сервере могла измениться — перечитываем
          authFetch<ServerCart>('/cart')
            .then((cart) => set({ items: fromServer(cart, get().items) }))
            .catch(() => undefined);
        }
      };

      return {
        items: [],
        mode: 'guest',
        lastError: null,
        dismissError: () => set({ lastError: null }),

        add: (item, quantity = 1) => {
          const before = get().items;
          const existing = before.find((i) => same(i, item.type, item.id));
          const limit = limitFor({ type: item.type, stock: item.stock ?? existing?.stock });
          const next = existing
            ? item.type === 'AUDIOBOOK'
              ? 1
              : Math.min(limit, existing.quantity + quantity)
            : Math.max(1, Math.min(limit, item.type === 'AUDIOBOOK' ? 1 : quantity));
          const added = next - (existing?.quantity ?? 0);
          set({
            items: existing
              ? before.map((i) => (i === existing ? { ...i, ...item, quantity: next } : i))
              : [...before, { ...item, quantity: next }],
          });
          if (get().mode === 'server' && added > 0) {
            void sync(
              () =>
                authFetch<ServerCart>('/cart/items', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...productBody(item),
                    ...(item.type === 'BOOK' && { quantity: added }),
                  }),
                }),
              before,
            );
          }
        },

        setQuantity: (type, id, quantity) => {
          const before = get().items;
          const line = before.find((i) => same(i, type, id));
          if (!line) return;
          const next = Math.max(1, Math.min(limitFor(line), quantity));
          set({
            items: before.map((i) =>
              i === line ? { ...i, quantity: next, issues: stockIssues(i, next) } : i,
            ),
          });
          if (get().mode === 'server' && line.lineId && type === 'BOOK' && next !== line.quantity) {
            void sync(
              () =>
                authFetch<ServerCart>(`/cart/items/${line.lineId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ quantity: next }),
                }),
              before,
            );
          }
        },

        remove: (type, id) => {
          const before = get().items;
          const line = before.find((i) => same(i, type, id));
          set({ items: before.filter((i) => !same(i, type, id)) });
          if (get().mode === 'server' && line?.lineId) {
            void sync(
              () => authFetch<ServerCart>(`/cart/items/${line.lineId}`, { method: 'DELETE' }),
              before,
            );
          }
        },

        clear: () => {
          const before = get().items;
          set({ items: [] });
          if (get().mode === 'server' && before.length > 0) {
            authFetch('/cart', { method: 'DELETE' }).catch(() => set({ items: before }));
          }
        },

        attach: async () => {
          const { mode, items } = get();
          if (mode === 'server') {
            const cart = await authFetch<ServerCart>('/cart');
            set({ items: fromServer(cart, items) });
            return { skipped: 0 };
          }
          const result = await authFetch<{ cart: ServerCart; skipped: unknown[] }>('/cart/merge', {
            method: 'POST',
            body: JSON.stringify({
              items: items.slice(0, 50).map((item) => ({
                ...productBody(item),
                ...(item.type === 'BOOK' && { quantity: item.quantity }),
              })),
            }),
          });
          set({ items: fromServer(result.cart, items), mode: 'server' });
          return { skipped: result.skipped.length };
        },

        detach: () => set({ items: [], mode: 'guest', lastError: null }),

        refreshGuest: async () => {
          if (get().mode !== 'guest' || get().items.length === 0) return;
          const fresh = await Promise.all(
            get().items.map(async (item) => {
              const path = item.type === 'BOOK' ? 'books' : 'audiobooks';
              try {
                const product = await apiFetch<{
                  price: number;
                  stockQuantity?: number;
                  title: string;
                  coverUrl: string | null;
                }>(`/${path}/${encodeURIComponent(item.slug)}`);
                const stock = item.type === 'BOOK' ? (product.stockQuantity ?? 0) : undefined;
                const issues: CartIssue[] =
                  stock === undefined
                    ? []
                    : stock === 0
                      ? ['OUT_OF_STOCK']
                      : stock < item.quantity
                        ? ['INSUFFICIENT_STOCK']
                        : [];
                return {
                  ...item,
                  title: product.title,
                  coverUrl: product.coverUrl,
                  price: product.price,
                  stock,
                  issues,
                  previousPrice:
                    product.price !== item.price
                      ? (item.previousPrice ?? item.price)
                      : item.previousPrice,
                };
              } catch (error) {
                return error instanceof ApiRequestError && error.status === 404
                  ? { ...item, issues: ['UNAVAILABLE' as const] }
                  : item;
              }
            }),
          );
          // Пока шёл запрос, покупатель мог что-то удалить — обновляем только оставшиеся
          set((state) => ({
            items: state.items.map(
              (item) => fresh.find((f) => same(f, item.type, item.id)) ?? item,
            ),
          }));
        },
      };
    },
    {
      name: 'oku24-cart',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({ items: state.items, mode: state.mode }),
      // v1: только гостевая корзина без режима
      migrate: (persisted) => ({ ...(persisted as object), mode: 'guest' }) as never,
    },
  ),
);

export const cartCount = (items: GuestCartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

/** Сумма позиций, которые можно заказать, тыйын. */
export const cartSubtotal = (items: GuestCartItem[]) =>
  items
    .filter((item) => !item.issues?.length)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
