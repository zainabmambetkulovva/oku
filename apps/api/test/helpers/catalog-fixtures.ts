import { PrismaService } from '../../src/prisma/prisma.service';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Небольшой каталог для тестов публичного API:
 *  - категории: fiction → classics, non-fiction, скрытая hidden;
 *  - книги: 3 опубликованные, черновик и архивная;
 *  - аудиокниги: опубликованная с главами и черновик.
 */
export async function seedCatalog(prisma: PrismaService) {
  const fiction = await prisma.category.create({
    data: { name: 'Художественная литература', slug: 'fiction', sortOrder: 1 },
  });
  const classics = await prisma.category.create({
    data: { name: 'Классика', slug: 'classics', parentId: fiction.id },
  });
  const nonFiction = await prisma.category.create({
    data: { name: 'Нон-фикшн', slug: 'non-fiction', sortOrder: 2 },
  });
  const hidden = await prisma.category.create({
    data: { name: 'Скрытая', slug: 'hidden', isActive: false },
  });

  const book = (data: {
    slug: string;
    title: string;
    author: string;
    price: number;
    stockQuantity: number;
    language: string;
    salesCount: number;
    createdAt: Date;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    categoryIds: string[];
  }) => {
    const { categoryIds, ...fields } = data;
    return prisma.book.create({
      data: {
        status: 'ACTIVE',
        description: `Описание: ${fields.title}`,
        publisher: 'Демо',
        ...fields,
        bookCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  };

  const jamila = await book({
    slug: 'jamila',
    title: 'Джамиля',
    author: 'Чингиз Айтматов',
    price: 65_000,
    stockQuantity: 10,
    language: 'ru',
    salesCount: 5,
    createdAt: daysAgo(3),
    categoryIds: [classics.id, hidden.id],
  });
  const whiteShip = await book({
    slug: 'white-ship',
    title: 'Белый пароход',
    author: 'Чингиз Айтматов',
    price: 72_000,
    stockQuantity: 0,
    language: 'ru',
    salesCount: 20,
    createdAt: daysAgo(2),
    categoryIds: [classics.id],
  });
  const cleanCode = await book({
    slug: 'clean-code',
    title: 'Clean Code',
    author: 'Robert Martin',
    price: 150_000,
    stockQuantity: 3,
    language: 'en',
    salesCount: 1,
    createdAt: daysAgo(1),
    categoryIds: [nonFiction.id],
  });
  await book({
    slug: 'draft-book',
    title: 'Черновик Айтматова',
    author: 'Чингиз Айтматов',
    price: 10_000,
    stockQuantity: 5,
    language: 'ru',
    salesCount: 100,
    createdAt: daysAgo(0),
    status: 'DRAFT',
    categoryIds: [classics.id],
  });
  await book({
    slug: 'archived-book',
    title: 'Архивная книга',
    author: 'Чингиз Айтматов',
    price: 10_000,
    stockQuantity: 5,
    language: 'ru',
    salesCount: 100,
    createdAt: daysAgo(0),
    status: 'ARCHIVED',
    categoryIds: [classics.id],
  });

  const jamilaAudio = await prisma.audiobook.create({
    data: {
      slug: 'jamila-audio',
      title: 'Джамиля (аудиокнига)',
      author: 'Чингиз Айтматов',
      narrator: 'Диктор',
      language: 'ru',
      price: 45_000,
      durationSeconds: 3000,
      status: 'ACTIVE',
      audiobookCategories: { create: [{ categoryId: classics.id }] },
      audioChapters: {
        create: [
          {
            chapterNumber: 1,
            title: 'Глава 1',
            durationSeconds: 1000,
            storageKey: 'audiobooks/chapters/x/1.mp3',
            isFreePreview: true,
          },
          {
            chapterNumber: 2,
            title: 'Глава 2',
            durationSeconds: 2000,
            storageKey: 'audiobooks/chapters/x/2.mp3',
          },
        ],
      },
    },
  });
  await prisma.audiobook.create({
    data: {
      slug: 'draft-audio',
      title: 'Черновик аудио',
      author: 'Чингиз Айтматов',
      price: 10_000,
      status: 'DRAFT',
    },
  });

  return { fiction, classics, nonFiction, hidden, jamila, whiteShip, cleanCode, jamilaAudio };
}
