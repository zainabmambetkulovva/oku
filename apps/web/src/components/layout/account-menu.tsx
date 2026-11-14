'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { authFetch, logout, refreshSession, useAuth } from '@/lib/auth';
import { UserIcon } from '../ui/icons';

/** Кабинет в шапке: гостю — ссылка на вход, покупателю — меню с выходом. */
export function AccountMenu({ className }: { className: string }) {
  const t = useTranslations('auth.account');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [resent, setResent] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !box.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (status !== 'authenticated' || !user) {
    const next =
      pathname.startsWith('/login') || pathname === '/'
        ? ''
        : `?next=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/login${next}`}
        className={className}
        aria-label={tn('account')}
        data-testid="account-link"
      >
        <UserIcon />
      </Link>
    );
  }

  const name = user.firstName || user.email.split('@')[0];
  const item = 'block rounded-xl px-3 py-2 text-sm text-ink hover:bg-cocoa-100';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className={className}
        aria-label={t('menu')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        data-testid="account-menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#e7cfa3] to-[#c49a5e] text-sm font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/60 bg-milk p-2 shadow-[var(--shadow-card)]"
        >
          <p className="px-3 pt-2 text-sm font-semibold text-cocoa">{t('hello', { name })}</p>
          <p className="truncate px-3 pb-2 text-xs text-muted">{user.email}</p>
          {!user.emailVerified && (
            <div className="mx-1 mb-2 rounded-xl bg-[#f6e3c3] px-3 py-2 text-xs text-[#7a4a12]">
              {t('unverified')}
              <button
                type="button"
                disabled={resent}
                onClick={async () => {
                  await authFetch('/auth/resend-verification', {
                    method: 'POST',
                    body: JSON.stringify({ locale }),
                  }).catch(() => undefined);
                  setResent(true);
                }}
                className="mt-1 block font-semibold underline disabled:no-underline"
              >
                {resent ? t('resent') : t('resend')}
              </button>
            </div>
          )}
          {user.role === 'ADMIN' && (
            <Link href="/admin" role="menuitem" className={item}>
              {t('admin')}
            </Link>
          )}
          <Link href="/favorites" role="menuitem" className={item}>
            {t('favorites')}
          </Link>
          <Link href="/cart" role="menuitem" className={item}>
            {t('cart')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void logout().then(() => setOpen(false))}
            className={`${item} w-full text-left text-[#8a3524]`}
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
