'use client';

import { useTranslations } from 'next-intl';
import { type ComponentProps, useState } from 'react';

const input =
  'w-full rounded-2xl border border-sand bg-white/80 py-3 pr-12 pl-4 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';

/** Поле пароля с кнопкой «Показать / скрыть». */
export function PasswordInput({ className = '', ...props }: ComponentProps<'input'>) {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);
  return (
    <span className={`relative mt-1.5 block ${className}`}>
      <input {...props} type={visible ? 'text' : 'password'} className={input} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-cocoa/70 transition hover:bg-cocoa-100 hover:text-cocoa"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[1.1rem]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          aria-hidden="true"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" strokeLinecap="round" />}
        </svg>
      </button>
    </span>
  );
}

export const textInputClass =
  'mt-1.5 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30';
