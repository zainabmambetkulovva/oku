import meninAdepAkhlagym from '@/assets/covers/menin-adep-akhlagym.webp';
import meninAdepAkhlagymFlat from '@/assets/covers/flat/menin-adep-akhlagym.webp';
import adeptuulukAlippesi from '@/assets/covers/adeptuuluk-alippesi.webp';
import adeptuulukAlippesiFlat from '@/assets/covers/flat/adeptuuluk-alippesi.webp';
import kyrgyzJomoktorununAltynJyinagy from '@/assets/covers/kyrgyz-jomoktorunun-altyn-jyinagy.webp';
import kyrgyzJomoktorununAltynJyinagyFlat from '@/assets/covers/flat/kyrgyz-jomoktorunun-altyn-jyinagy.webp';
import ilmihalym from '@/assets/covers/ilmihalym.webp';
import ilmihalymFlat from '@/assets/covers/flat/ilmihalym.webp';
import asmaulHusnaAtlasy from '@/assets/covers/asmaul-husna-atlasy.webp';
import asmaulHusnaAtlasyFlat from '@/assets/covers/flat/asmaul-husna-atlasy.webp';

/**
 * Обложки книг, присланные магазином. Лежат в src/assets/covers и подключаются
 * как модули (папка public/ в проекте Vercel с сервисами не отдаётся) и используются:
 * — в витрине на главной;
 * — в каталоге для книг и аудиокниг с тем же названием, если в админке
 *   своя обложка не загружена (у аудиокниги та же обложка, но с отметкой «аудио»).
 * Новые обложки добавляются сюда же.
 */
/** Next.js отдаёт картинку объектом { src }, тестовая среда (Vite) — строкой. */
const url = (image: { src: string } | string) => (typeof image === 'string' ? image : image.src);

export interface FeaturedCover {
  key: string;
  title: string;
  /** Объёмный макет книги (прозрачный фон) — для витрины на главной */
  src: string;
  width: number;
  height: number;
  /** Плоская лицевая обложка — для каталога, корзины, кабинета */
  flat: string;
  /** Главный цвет обложки: подсветка витрины и название книги */
  accent: string;
}

/** Детские книги — витрина в детском разделе (/kids). */
export const KIDS_COVERS: FeaturedCover[] = [
  {
    key: 'menin-adep-akhlagym',
    title: 'Менин адеп-ахлагым',
    src: url(meninAdepAkhlagym),
    flat: url(meninAdepAkhlagymFlat),
    accent: '#1F7FC0',
    width: 623,
    height: 840,
  },
  {
    key: 'adeptuuluk-alippesi',
    title: 'Адептуулук алиппеси',
    src: url(adeptuulukAlippesi),
    flat: url(adeptuulukAlippesiFlat),
    accent: '#D3407F',
    width: 794,
    height: 840,
  },
  {
    key: 'kyrgyz-jomoktorunun-altyn-jyinagy',
    title: 'Кыргыз жомокторунун алтын жыйнагы',
    src: url(kyrgyzJomoktorununAltynJyinagy),
    flat: url(kyrgyzJomoktorununAltynJyinagyFlat),
    accent: '#1F6B45',
    width: 612,
    height: 840,
  },
  {
    key: 'ilmihalym',
    title: 'Илмихалым',
    src: url(ilmihalym),
    flat: url(ilmihalymFlat),
    accent: '#E08A1E',
    width: 611,
    height: 840,
  },
  {
    key: 'asmaul-husna-atlasy',
    title: 'Асмаул-Хусна атласы',
    src: url(asmaulHusnaAtlasy),
    flat: url(asmaulHusnaAtlasyFlat),
    accent: '#2B3FA0',
    width: 602,
    height: 840,
  },
];

/**
 * «Новые поступления» на главной — книги для взрослых. Пока пусто: блок на главной
 * не показывается, пока магазин не пришлёт обложки.
 */
export const NEW_ARRIVAL_COVERS: FeaturedCover[] = [];

/** Все присланные обложки — для подстановки в каталоге по названию. */
export const FEATURED_COVERS: FeaturedCover[] = [...NEW_ARRIVAL_COVERS, ...KIDS_COVERS];

/** Название без учёта регистра, лишних пробелов, вида тире и кавычек. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'„“”]/g, '')
    .replace(/\s*[-‐‑‒–—]\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const byTitle = new Map(FEATURED_COVERS.map((cover) => [normalizeTitle(cover.title), cover]));

/** Обложка из присланных по названию товара, если она есть. */
export function featuredCoverFor(title: string): FeaturedCover | null {
  return byTitle.get(normalizeTitle(title)) ?? null;
}
