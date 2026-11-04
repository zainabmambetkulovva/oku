/**
 * Тестовые данные для разработки.
 *
 * Запуск: pnpm db:seed
 * В production не запускается. Повторный запуск безопасен (upsert по slug/email).
 *
 * Пользователи создаются, только если заданы переменные окружения:
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — администратор
 *   SEED_USER_EMAIL  / SEED_USER_PASSWORD  — обычный пользователь
 */
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// Цены — в тыйынах (1 сом = 100 тыйын)
const som = (amount: number) => amount * 100;

async function seedCategories() {
  const fiction = await prisma.category.upsert({
    where: { slug: 'fiction' },
    update: {},
    create: { name: 'Художественная литература', slug: 'fiction', sortOrder: 1 },
  });
  const nonFiction = await prisma.category.upsert({
    where: { slug: 'non-fiction' },
    update: {},
    create: { name: 'Нон-фикшн', slug: 'non-fiction', sortOrder: 2 },
  });
  const classics = await prisma.category.upsert({
    where: { slug: 'classics' },
    update: {},
    create: { name: 'Классика', slug: 'classics', parentId: fiction.id, sortOrder: 1 },
  });
  const business = await prisma.category.upsert({
    where: { slug: 'business' },
    update: {},
    create: { name: 'Бизнес', slug: 'business', parentId: nonFiction.id, sortOrder: 1 },
  });

  return { fiction, nonFiction, classics, business };
}

async function seedBooks(categories: Awaited<ReturnType<typeof seedCategories>>) {
  const books = [
    {
      slug: 'jamila',
      title: 'Джамиля',
      author: 'Чингиз Айтматов',
      publisher: 'Демо-издательство',
      publicationYear: 2020,
      pages: 128,
      language: 'ru',
      price: som(650),
      stockQuantity: 12,
      categoryIds: [categories.fiction.id, categories.classics.id],
    },
    {
      slug: 'white-ship',
      title: 'Белый пароход',
      author: 'Чингиз Айтматов',
      publisher: 'Демо-издательство',
      publicationYear: 2019,
      pages: 176,
      language: 'ru',
      price: som(720),
      stockQuantity: 5,
      categoryIds: [categories.fiction.id, categories.classics.id],
    },
    {
      slug: 'demo-business-book',
      title: 'Демо-книга о бизнесе',
      author: 'Демо Автор',
      publisher: 'Демо-издательство',
      publicationYear: 2024,
      pages: 240,
      language: 'ru',
      price: som(990),
      stockQuantity: 0,
      categoryIds: [categories.nonFiction.id, categories.business.id],
    },
  ];

  for (const { categoryIds, ...book } of books) {
    await prisma.book.upsert({
      where: { slug: book.slug },
      update: {},
      create: {
        ...book,
        description: `Демонстрационное описание книги «${book.title}».`,
        status: 'ACTIVE',
        bookCategories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  }

  return books.length;
}

async function seedAudiobooks(categories: Awaited<ReturnType<typeof seedCategories>>) {
  const chapters = [
    { chapterNumber: 1, title: 'Глава 1', durationSeconds: 1200, isFreePreview: true },
    { chapterNumber: 2, title: 'Глава 2', durationSeconds: 1500, isFreePreview: false },
    { chapterNumber: 3, title: 'Глава 3', durationSeconds: 1350, isFreePreview: false },
  ];
  const slug = 'jamila-audio';

  await prisma.audiobook.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title: 'Джамиля (аудиокнига)',
      author: 'Чингиз Айтматов',
      narrator: 'Демо Диктор',
      description: 'Демонстрационная аудиокнига. Первая глава доступна бесплатно.',
      language: 'ru',
      durationSeconds: chapters.reduce((sum, c) => sum + c.durationSeconds, 0),
      price: som(450),
      status: 'ACTIVE',
      audioChapters: {
        create: chapters.map((c) => ({
          ...c,
          // Ключи в S3. Сами файлы загружаются через админку (этап Б4)
          storageKey: `audiobooks/${slug}/chapter-${c.chapterNumber}.mp3`,
        })),
      },
      audiobookCategories: {
        create: [{ categoryId: categories.fiction.id }, { categoryId: categories.classics.id }],
      },
    },
  });

  return 1;
}

async function seedUser(
  emailVar: string,
  passwordVar: string,
  role: UserRole,
  names: { firstName: string; lastName: string },
) {
  const email = process.env[emailVar]?.trim().toLowerCase();
  const password = process.env[passwordVar];

  if (!email || !password) {
    console.log(`  ${role}: пропущен (не заданы ${emailVar} / ${passwordVar})`);
    return;
  }
  if (password.length < 8) {
    throw new Error(`${passwordVar} должен быть не короче 8 символов`);
  }

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hash(password, BCRYPT_ROUNDS),
      ...names,
      role,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ${role}: ${email}`);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed предназначен только для разработки и не запускается в production');
  }

  console.log('Seed: категории, книги, аудиокниги...');
  const categories = await seedCategories();
  const booksCount = await seedBooks(categories);
  const audiobooksCount = await seedAudiobooks(categories);
  console.log(`  категорий: 4, книг: ${booksCount}, аудиокниг: ${audiobooksCount}`);

  console.log('Seed: пользователи...');
  await seedUser('SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'ADMIN', {
    firstName: 'Admin',
    lastName: 'OKU_24',
  });
  await seedUser('SEED_USER_EMAIL', 'SEED_USER_PASSWORD', 'USER', {
    firstName: 'Demo',
    lastName: 'User',
  });

  console.log('Seed завершён');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
