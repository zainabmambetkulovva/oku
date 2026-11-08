/**
 * Обложка-заглушка для книги без загруженной обложки: цвет выбирается
 * по slug, поэтому у одной книги он одинаковый везде (карточка, 3D-сцена).
 */
export const COVER_PALETTE = [
  { background: '#3B2419', text: '#F3E3C8', accent: '#C49A5E' },
  { background: '#F1E4CF', text: '#3B2419', accent: '#A87C3E' },
  { background: '#1F3550', text: '#F1E6D2', accent: '#D7B06C' },
  { background: '#6B2E2A', text: '#F6E8D6', accent: '#D9B26F' },
  { background: '#1E1A17', text: '#EED9AE', accent: '#C9A45C' },
  { background: '#8D6733', text: '#FFF6E6', accent: '#3B2419' },
  { background: '#4D5A3A', text: '#F1EAD8', accent: '#E3C98E' },
] as const;

export type CoverColors = (typeof COVER_PALETTE)[number];

export function coverColors(seed: string): CoverColors {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return COVER_PALETTE[hash % COVER_PALETTE.length];
}
