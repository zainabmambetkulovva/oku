import zhomoktorKemesi from '@/assets/covers/zhomoktor-kemesi.webp';
import zhomoktorKemesiFlat from '@/assets/covers/flat/zhomoktor-kemesi.webp';
import bilimpoz from '@/assets/covers/bilimpoz.webp';
import bilimpozFlat from '@/assets/covers/flat/bilimpoz.webp';
import paigambarlarymdyJakshyKoromun from '@/assets/covers/paigambarlarymdy-jakshy-koromun.webp';
import paigambarlarymdyJakshyKoromunFlat from '@/assets/covers/flat/paigambarlarymdy-jakshy-koromun.webp';
import meninAdepAkhlagym from '@/assets/covers/menin-adep-akhlagym.webp';
import meninAdepAkhlagymFlat from '@/assets/covers/flat/menin-adep-akhlagym.webp';
import adeptuulukAlippesi from '@/assets/covers/adeptuuluk-alippesi.webp';
import adeptuulukAlippesiFlat from '@/assets/covers/flat/adeptuuluk-alippesi.webp';

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

export const FEATURED_COVERS: FeaturedCover[] = [
  {
    key: 'zhomoktor-kemesi',
    title: 'Жомоктор кемеси',
    src: url(zhomoktorKemesi),
    flat: url(zhomoktorKemesiFlat),
    accent: '#D6303F',
    width: 565,
    height: 840,
  },
  {
    key: 'bilimpoz',
    title: 'Билимпоз',
    src: url(bilimpoz),
    flat: url(bilimpozFlat),
    accent: '#C8166B',
    width: 596,
    height: 840,
  },
  {
    key: 'paigambarlarymdy-jakshy-koromun',
    title: 'Пайгамбарларымды жакшы көрөмүн',
    src: url(paigambarlarymdyJakshyKoromun),
    flat: url(paigambarlarymdyJakshyKoromunFlat),
    accent: '#1F8A3D',
    width: 620,
    height: 840,
  },
  {
    key: 'menin-adep-akhlagym',
    title: 'Менин адеп-ахлагым',
    src: url(meninAdepAkhlagym),
    flat: url(meninAdepAkhlagymFlat),
    accent: '#1F7FC0',
    width: 624,
    height: 840,
  },
  {
    key: 'adeptuuluk-alippesi',
    title: 'Адептуулук алиппеси',
    src: url(adeptuulukAlippesi),
    flat: url(adeptuulukAlippesiFlat),
    accent: '#D3407F',
    width: 807,
    height: 840,
  },
];

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
