/**
 * Обложки книг, присланные магазином. Лежат в public/covers и используются:
 * — в витрине на главной;
 * — в каталоге для книг и аудиокниг с тем же названием, если в админке
 *   своя обложка не загружена (у аудиокниги та же обложка, но с отметкой «аудио»).
 * Новые обложки добавляются сюда же.
 */
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
    src: '/covers/zhomoktor-kemesi.webp',
    flat: '/covers/flat/zhomoktor-kemesi.webp',
    accent: '#D6303F',
    width: 565,
    height: 840,
  },
  {
    key: 'bilimpoz',
    title: 'Билимпоз',
    src: '/covers/bilimpoz.webp',
    flat: '/covers/flat/bilimpoz.webp',
    accent: '#C8166B',
    width: 596,
    height: 840,
  },
  {
    key: 'paigambarlarymdy-jakshy-koromun',
    title: 'Пайгамбарларымды жакшы көрөмүн',
    src: '/covers/paigambarlarymdy-jakshy-koromun.webp',
    flat: '/covers/flat/paigambarlarymdy-jakshy-koromun.webp',
    accent: '#1F8A3D',
    width: 620,
    height: 840,
  },
  {
    key: 'menin-adep-akhlagym',
    title: 'Менин адеп-ахлагым',
    src: '/covers/menin-adep-akhlagym.webp',
    flat: '/covers/flat/menin-adep-akhlagym.webp',
    accent: '#1F7FC0',
    width: 624,
    height: 840,
  },
  {
    key: 'adeptuuluk-alippesi',
    title: 'Адептуулук алиппеси',
    src: '/covers/adeptuuluk-alippesi.webp',
    flat: '/covers/flat/adeptuuluk-alippesi.webp',
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
