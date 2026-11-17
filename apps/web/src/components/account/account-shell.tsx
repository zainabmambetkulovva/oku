'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { logout, refreshSession, useAuth } from '@/lib/auth';
import { buttonClasses } from '../ui/button';
import { useUnreadCount } from './use-account';

const LINKS = [
  ['/account', 'overview'],
  ['/account/orders', 'orders'],
  ['/account/audiobooks', 'audiobooks'],
  ['/account/notifications', 'notifications'],
  ['/account/profile', 'profile'],
  ['/account/addresses', 'addresses'],
] as const;

/** Каркас личного кабинета: меню разделов и проверка входа. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('account');
  const ta = useTranslations('auth');
  const pathname = usePathname();
  const status = useAuth((state) => state.status);
  const unread = useUnreadCount();

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  if (status === 'unknown') {
    return (
      <p className="container-page min-h-[70vh] py-12 animate-pulse text-sm text-muted">
        {t('loading')}
      </p>
    );
  }
  if (status === 'guest') {
    return (
      <div className="container-page py-12">
        <div className="card max-w-xl p-8">
          <p className="text-sm">{t('signIn')}</p>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className={buttonClasses('primary', 'mt-5')}
          >
            {ta('toLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-[2rem] font-medium text-cocoa sm:text-[2.5rem]">{t('title')}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label={t('title')}
          className="scroll-row lg:block lg:space-y-1"
          data-testid="account-nav"
        >
          {LINKS.map(([href, key]) => {
            const active = href === '/account' ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${active ? 'bg-cocoa text-milk' : 'text-ink hover:bg-cocoa-100'}`}
              >
                {t(`nav.${key}`)}
                {key === 'notifications' && unread > 0 && (
                  <span
                    className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[0.65rem] font-bold ${active ? 'bg-gold text-cocoa-900' : 'bg-cocoa text-milk'}`}
                    data-testid="unread-count"
                  >
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-[#8a3524] hover:bg-cocoa-100 lg:w-full"
          >
            {t('nav.logout')}
          </button>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
