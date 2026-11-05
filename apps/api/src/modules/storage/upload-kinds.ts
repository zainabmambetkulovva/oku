/**
 * Виды загружаемых файлов: куда кладётся файл, какие типы и размеры допустимы.
 * Публичные файлы (обложки, изображения) — в публичный бакет за CDN,
 * аудиофайлы — в закрытый бакет, выдаются только по подписанным ссылкам (этап Б5).
 */
export const UPLOAD_KINDS = {
  'book-cover': { visibility: 'public', prefix: 'books/covers', category: 'image' },
  'book-image': { visibility: 'public', prefix: 'books/images', category: 'image' },
  'audiobook-cover': { visibility: 'public', prefix: 'audiobooks/covers', category: 'image' },
  'category-image': { visibility: 'public', prefix: 'categories', category: 'image' },
  'audio-chapter': { visibility: 'private', prefix: 'audiobooks/chapters', category: 'audio' },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;
export const UPLOAD_KIND_VALUES = Object.keys(UPLOAD_KINDS) as UploadKind[];

const MB = 1024 * 1024;

export const FILE_CATEGORIES = {
  image: {
    maxBytes: 5 * MB,
    contentTypes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
  },
  audio: {
    maxBytes: 500 * MB,
    contentTypes: {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/ogg': 'ogg',
    },
  },
} as const satisfies Record<string, { maxBytes: number; contentTypes: Record<string, string> }>;

export function uploadRules(kind: UploadKind) {
  const config = UPLOAD_KINDS[kind];
  const category = FILE_CATEGORIES[config.category];
  return {
    ...config,
    maxBytes: category.maxBytes,
    contentTypes: category.contentTypes as Record<string, string>,
  };
}
