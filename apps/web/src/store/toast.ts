import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  /** Необязательная ссылка-действие, например «Открыть корзину» */
  action?: { label: string; href: string };
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Короткие уведомления внизу экрана (исчезают сами через 3,5 с). */
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
