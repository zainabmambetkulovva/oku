import type { Locale } from '@/i18n/routing';

const NUMBER_LOCALE: Record<Locale, string> = { ky: 'ru-RU', ru: 'ru-RU', en: 'en-US' };
const CURRENCY_UNIT: Record<Locale, string> = { ky: 'сом', ru: 'сом', en: 'som' };

/**
 * Цена из тыйынов (так её хранит и отдаёт API) в строку для показа:
 * 65000 → «650 сом», 65050 → «650,50 сом», 150000 → «1 500 сом».
 */
export function formatPrice(tyiyn: number, locale: Locale): string {
  const som = tyiyn / 100;
  const hasFraction = !Number.isInteger(som);
  const number = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(som);
  return `${number.replace(/\u202f/g, '\u00a0')}\u00a0${CURRENCY_UNIT[locale]}`;
}

/** Длительность аудио: 4500 → { hours: 1, minutes: 15 }. */
export function splitDuration(totalSeconds: number): { hours: number; minutes: number } {
  const minutes = Math.round(totalSeconds / 60);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** Время для плеера: 75 → «1:15», 3725 → «1:02:05». */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
