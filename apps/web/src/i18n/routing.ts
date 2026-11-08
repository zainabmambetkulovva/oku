import { defineRouting } from 'next-intl/routing';

/**
 * Языки сайта: кыргызский и русский.
 * Язык выбирается по адресу (/ky, /ru); при первом заходе — по настройкам браузера.
 */
export const routing = defineRouting({
  locales: ['ky', 'ru'],
  defaultLocale: 'ky',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

/** Подписи для переключателя языка. */
export const LOCALE_LABELS: Record<Locale, string> = { ky: 'KG', ru: 'RU' };
