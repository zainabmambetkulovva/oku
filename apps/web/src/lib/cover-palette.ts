/**
 * Обложка-заглушка для книги без загруженной обложки: цвет выбирается
 * по slug, поэтому у одной книги он одинаковый везде (карточка, 3D-сцена).
 */
export const COVER_PALETTE = [
  { background: '#1F3D2B', text: '#F3E7CF', accent: '#C9A45C' },
  { background: '#6E2C2C', text: '#F6E9D8', accent: '#D9B26F' },
  { background: '#22324A', text: '#EFE6D6', accent: '#C9A45C' },
  { background: '#EFE3CC', text: '#2A2418', accent: '#8C6B2F' },
  { background: '#2F5D5A', text: '#F1E8D6', accent: '#E3C98E' },
  { background: '#B7832F', text: '#FFF8EA', accent: '#3B2A12' },
  { background: '#4A2C45', text: '#F3E6EC', accent: '#D8B46A' },
] as const;

export type CoverColors = (typeof COVER_PALETTE)[number];

export function coverColors(seed: string): CoverColors {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return COVER_PALETTE[hash % COVER_PALETTE.length];
}
