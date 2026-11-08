'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { CloseIcon, MenuIcon } from '../ui/icons';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';

/** Меню для телефонов: выезжает слева, закрывается по Esc и при переходе. */
export function MobileMenu() {
  const t = useTranslations('nav');
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
    { href: '/#about', label: t('about') },
    { href: '/#contacts', label: t('contacts') },
    { href: '/favorites', label: t('favorites') },
    { href: '/account', label: t('account') },
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
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('menu')}>
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label={t('close')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-milk p-6 shadow-2xl">
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
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-beige"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <LanguageSwitcher className="mt-auto text-cocoa" />
          </div>
        </div>
      )}
    </div>
  );
}
