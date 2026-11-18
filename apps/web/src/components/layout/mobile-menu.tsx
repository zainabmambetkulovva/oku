'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, usePathname } from '@/i18n/navigation';
import { logout, useAuth } from '@/lib/auth';
import { CloseIcon, MenuIcon } from '../ui/icons';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';

/** Меню для телефонов: выезжает справа, закрывается по Esc и при переходе. */
export function MobileMenu() {
  const t = useTranslations('nav');
  const ta = useTranslations('auth.account');
  const user = useAuth((state) => state.user);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const links = [
    { href: '/', label: t('home') },
    { href: '/books', label: t('books') },
    { href: '/audiobooks', label: t('audiobooks') },
    { href: '/community', label: t('community') },
    { href: '/about', label: t('about') },
    { href: '/contacts', label: t('contacts') },
    { href: '/delivery', label: t('delivery') },
    { href: '/favorites', label: t('favorites') },
    user ? { href: '/account', label: t('account') } : { href: '/login', label: t('account') },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: ta('admin') }] : []),
  ];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('menu')}
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-full text-cocoa hover:bg-cocoa-100"
      >
        <MenuIcon />
      </button>
      {/* Через портал в body: у шапки backdrop-filter, а он «запирает» position: fixed
          внутри шапки — меню было высотой с шапку и без фона */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60]"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            <button
              type="button"
              className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] motion-safe:animate-[fade-in_0.25s_ease-out]"
              aria-label={t('close')}
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 flex w-[84%] max-w-sm flex-col overflow-y-auto bg-[#fbf3e8] p-6 shadow-2xl motion-safe:animate-[slide-in-right_0.35s_cubic-bezier(0.2,0.8,0.2,1)]">
              <div className="mb-8 flex items-center justify-between">
                <LogoBadge className="size-10" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="text-cocoa"
                >
                  <CloseIcon />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-base font-medium text-ink transition-colors hover:bg-beige motion-safe:animate-[rise-in_0.45s_cubic-bezier(0.2,0.8,0.2,1)_both]"
                    style={{ animationDelay: `${80 + index * 40}ms` }}
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <button
                    type="button"
                    onClick={() => void logout().then(() => setOpen(false))}
                    className="rounded-xl px-3 py-3 text-left text-base font-medium text-[#8a3524] hover:bg-beige"
                  >
                    {ta('logout')}{' '}
                    <span className="text-sm font-normal text-muted">({user.email})</span>
                  </button>
                )}
              </nav>
              <LanguageSwitcher className="mt-auto pt-6 text-cocoa" />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
