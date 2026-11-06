'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { LOCALE_LABELS, routing, type Locale } from '@/i18n/routing';

/** KG | RU | EN — как в макете. Ссылки обычные, поэтому работают и без JavaScript. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('language')}
      className={`flex items-center text-xs font-semibold ${className}`}
    >
      {routing.locales.map((code, index) => (
        <span key={code} className="flex items-center">
          {index > 0 && (
            <span className="mx-1.5 h-3 w-px bg-current opacity-30" aria-hidden="true" />
          )}
          <a
            href={`/${code}${pathname === '/' ? '' : pathname}`}
            hrefLang={code}
            lang={code}
            aria-current={code === locale ? 'true' : undefined}
            className={`rounded px-1 py-0.5 transition-opacity ${code === locale ? 'opacity-100 underline decoration-gold decoration-2 underline-offset-4' : 'opacity-60 hover:opacity-100'}`}
          >
            {LOCALE_LABELS[code]}
          </a>
        </span>
      ))}
    </nav>
  );
}
