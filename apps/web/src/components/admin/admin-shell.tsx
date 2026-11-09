'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { logout, refreshSession, useAuth } from '@/lib/auth';
import { LanguageSwitcher } from '../layout/language-switcher';
import { LogoBadge } from '../layout/logo';
import { CloseIcon, MenuIcon } from '../ui/icons';

const NAV = [
  {
    href: '/admin',
    key: 'dashboard',
    icon: 'M4 13h6V4H4zm10 7h6V11h-6zM4 20h6v-4H4zm10-11h6V4h-6z',
  },
  {
    href: '/admin/books',
    key: 'books',
    icon: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13',
  },
  {
    href: '/admin/categories',
    key: 'categories',
    icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
  },
] as const;

/**
 * Каркас админки: проверка входа и роли, меню слева (на телефоне — выдвижное),
 * язык и выход. Данные админки запрашиваются только после проверки.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const status = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (status !== 'authenticated') {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted" role="status">
        {t('checking')}
      </div>
    );
  }
  if (user?.role !== 'ADMIN') {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="card max-w-sm p-8">
          <p className="text-cocoa">{t('forbidden')}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold underline">
            {t('nav.toSite')}
          </Link>
        </div>
      </div>
    );
  }

  const active = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const sidebar = (
    <nav aria-label={t('menu')} className="flex h-full flex-col gap-1 p-4">
      <Link href="/admin" className="mb-6 flex items-center gap-3 px-2">
        <LogoBadge className="size-10" />
        <span className="font-display text-lg text-cocoa">{t('title')}</span>
      </Link>
      {NAV.map(({ href, key, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${active(href) ? 'bg-cocoa text-milk shadow-md' : 'text-ink/80 hover:bg-white/60'}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={icon} />
          </svg>
          {t(`nav.${key}`)}
        </Link>
      ))}
      <div className="mt-auto space-y-3 border-t border-sand/60 pt-4 text-sm">
        <p className="truncate px-2 text-xs text-muted" title={user.email}>
          {user.email}
        </p>
        <LanguageSwitcher className="px-2 text-cocoa" />
        <Link href="/" className="block rounded-2xl px-3 py-2 text-ink/80 hover:bg-white/60">
          {t('nav.toSite')}
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="w-full rounded-2xl px-3 py-2 text-left text-[#8a3524] hover:bg-white/60"
        >
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-white/50 bg-[#fbebdd]/70 backdrop-blur lg:block">
        {sidebar}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
        >
          <button
            type="button"
            className="absolute inset-0 bg-cocoa/40"
            aria-label={t('common.cancel')}
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-milk shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/50 bg-milk/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={t('menu')}
            className="grid size-10 place-items-center rounded-full text-cocoa hover:bg-white/60"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <span className="font-display text-lg text-cocoa">{t('title')}</span>
        </div>
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
