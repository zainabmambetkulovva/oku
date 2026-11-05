import { Prisma } from '@prisma/client';
import { categorySummarySelect, toCategorySummaries } from '../catalog/catalog.mapper';
import { Rating } from '../reviews/ratings.service';
import { StorageService } from '../storage/storage.service';

export const audiobookInclude = {
  audiobookCategories: {
    include: { category: { select: { ...categorySummarySelect, isActive: true } } },
  },
  audioChapters: { orderBy: { chapterNumber: 'asc' } },
} satisfies Prisma.AudiobookInclude;

export type AudiobookWithRelations = Prisma.AudiobookGetPayload<{
  include: typeof audiobookInclude;
}>;

export function toAudiobookListItem(
  audiobook: AudiobookWithRelations,
  storage: StorageService,
  rating: Rating,
) {
  return {
    id: audiobook.id,
    slug: audiobook.slug,
    title: audiobook.title,
    author: audiobook.author,
    narrator: audiobook.narrator,
    coverUrl: storage.publicUrl(audiobook.coverKey),
    language: audiobook.language,
    durationSeconds: audiobook.durationSeconds,
    chaptersCount: audiobook.audioChapters.length,
    hasFreePreview: audiobook.audioChapters.some((chapter) => chapter.isFreePreview),
    price: audiobook.price,
    currency: audiobook.currency,
    categories: toCategorySummaries(audiobook.audiobookCategories),
    rating,
    createdAt: audiobook.createdAt,
  };
}

/**
 * Страница аудиокниги. Ключи файлов глав не отдаются:
 * доступ к аудио выдаётся отдельно, с проверкой покупки (этап Б5).
 */
export function toAudiobookDetails(
  audiobook: AudiobookWithRelations,
  storage: StorageService,
  rating: Rating,
) {
  return {
    ...toAudiobookListItem(audiobook, storage, rating),
    description: audiobook.description,
    chapters: audiobook.audioChapters.map((chapter) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      description: chapter.description,
      durationSeconds: chapter.durationSeconds,
      isFreePreview: chapter.isFreePreview,
    })),
  };
}

export function toAdminAudiobook(audiobook: AudiobookWithRelations, storage: StorageService) {
  const { audiobookCategories, audioChapters, ...fields } = audiobook;
  return {
    ...fields,
    coverUrl: storage.publicUrl(audiobook.coverKey),
    categories: audiobookCategories.map(({ category }) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    chapters: audioChapters,
  };
}
