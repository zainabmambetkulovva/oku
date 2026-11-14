'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useToasts } from '@/store/toast';
import { CheckIcon, CloseIcon } from './icons';

/** Уведомления: озвучиваются экранным диктором, не перекрывают клики по странице. */
export function Toaster() {
  const t = useTranslations('toast');
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-md animate-[page-in_0.35s_cubic-bezier(0.2,0.7,0.2,1)] items-center gap-3 rounded-2xl bg-cocoa px-4 py-3 text-sm text-milk shadow-2xl"
          data-testid="toast"
        >
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-full ${toast.tone === 'error' ? 'bg-[#e8b4a6] text-[#5a1f12]' : 'bg-gold text-cocoa-900'}`}
          >
            {toast.tone === 'error' ? '!' : <CheckIcon className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.action && 'onClick' in toast.action && (
            <button
              type="button"
              className="shrink-0 font-semibold text-gold-light underline"
              onClick={() => {
                (toast.action as { onClick: () => void }).onClick();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          {toast.action && 'href' in toast.action && (
            <Link
              href={toast.action.href}
              className="shrink-0 font-semibold text-gold-light underline"
              onClick={() => dismiss(toast.id)}
            >
              {toast.action.label}
            </Link>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('close')}
            className="shrink-0 text-milk/70 hover:text-milk"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
