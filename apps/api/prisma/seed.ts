/**
 * Демо-данные для разработки.
 *
 * Запуск: pnpm db:seed
 * В production не запускается. Повторный запуск безопасен (upsert по slug/email).
 *
 * Книги — демо-каталог по ассортименту OKU24 (названия из Instagram @oku_24);
 * цены, остатки и описания — условные. Обложки загружаются в админке.
 * Для аудиокниг генерируются короткие демо-файлы (нужны ffmpeg и настроенное S3).
 *
 * Пользователи создаются, только если заданы переменные окружения:
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — администратор
 *   SEED_USER_EMAIL  / SEED_USER_PASSWORD  — обычный пользователь
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// Цены — в тыйынах (1 сом = 100 тыйын)
const som = (amount: number) => amount * 100;

const CATEGORIES = [
  { slug: 'psychology', name: 'Психология', sortOrder: 1 },
  { slug: 'self-development', name: 'Саморазвитие', sortOrder: 2 },
  { slug: 'islamic-literature', name: 'Исламская литература', sortOrder: 3 },
  { slug: 'kids', name: 'Детские книги', sortOrder: 4 },
  { slug: 'fiction', name: 'Художественная литература', sortOrder: 5 },
  { slug: 'classics', name: 'Классика', parentSlug: 'fiction', sortOrder: 1 },
] as const;

type CategorySlug = (typeof CATEGORIES)[number]['slug'];

const BOOKS: {
  slug: string;
  title: string;
  author: string;
  language: 'ky' | 'ru' | 'en';
  price: number;
  stockQuantity: number;
  salesCount: number;
  pages: number;
  publicationYear: number;
  categories: CategorySlug[];
}[] = [
  {
    slug: 'suranam-kyianat-kylba',
    title: 'Суранам, кыянат кылба',
    author: 'Амина Шенликоглу',
    language: 'ky',
    price: som(750),
    stockQuantity: 14,
    salesCount: 42,
    pages: 312,
    publicationYear: 2024,
    categories: ['islamic-literature', 'fiction'],
  },
  {
    slug: 'duinodogu-en-maaniluu-okuuchu',
    title: 'Дүйнөдөгү эң маанилүү окуучу',
    author: 'Шермин Яшар',
    language: 'ky',
    price: som(650),
    stockQuantity: 20,
    salesCount: 37,
    pages: 224,
    publicationYear: 2023,
    categories: ['kids', 'self-development'],
  },
  {
    slug: 'shakhmat-novellasy',
    title: 'Шахмат новелласы',
    author: 'Стефан Цвейг',
    language: 'ky',
    price: som(550),
    stockQuantity: 9,
    salesCount: 25,
    pages: 128,
    publicationYear: 2024,
    categories: ['fiction', 'classics'],
  },
  {
    slug: 'taigada-kalgan-omur',
    title: 'Тайгада калган өмүр',
    author: 'Бекмамбет Атаканов (Сибиряк)',
    language: 'ky',
    price: som(800),
    stockQuantity: 6,
    salesCount: 18,
    pages: 286,
    publicationYear: 2023,
    categories: ['fiction', 'psychology'],
  },
  {
    slug: 'kun-batkanga-cheiin',
    title: 'Күн батканга чейин',
    author: 'Халит Эртугрул',
    language: 'ky',
    price: som(700),
    stockQuantity: 11,
    salesCount: 30,
    pages: 256,
    publicationYear: 2024,
    categories: ['islamic-literature'],
  },
  {
    slug: 'aitpagyn-bilishsin',
    title: 'Айтпагын, билишсин',
    author: 'Шермин Яшар',
    language: 'ky',
    price: som(700),
    stockQuantity: 2,
    salesCount: 22,
    pages: 240,
    publicationYear: 2023,
    categories: ['psychology', 'self-development'],
  },
  {
    slug: 'alty-tamgaluu-tatuu',
    title: 'Алты тамгалуу татуу',
    author: 'Шермин Яшар',
    language: 'ky',
    price: som(700),
    stockQuantity: 0,
    salesCount: 15,
    pages: 232,
    publicationYear: 2023,
    categories: ['kids'],
  },
  {
    slug: 'jamila',
    title: 'Джамиля',
    author: 'Чингиз Айтматов',
    language: 'ru',
    price: som(650),
    stockQuantity: 12,
    salesCount: 28,
    pages: 128,
    publicationYear: 2020,
    categories: ['fiction', 'classics'],
  },
  {
    slug: 'white-ship',
    title: 'Белый пароход',
    author: 'Чингиз Айтматов',
    language: 'ru',
    price: som(720),
    stockQuantity: 5,
    salesCount: 20,
    pages: 176,
    publicationYear: 2019,
    categories: ['fiction', 'classics'],
  },
  {
    slug: 'the-day-lasts-more-than-a-hundred-years',
    title: 'The Day Lasts More Than a Hundred Years',
    author: 'Chingiz Aitmatov',
    language: 'en',
    price: som(1200),
    stockQuantity: 4,
    salesCount: 9,
    pages: 368,
    publicationYear: 2018,
    categories: ['fiction', 'classics'],
  },
];

const AUDIOBOOKS: {
  slug: string;
  title: string;
  author: string;
  narrator: string;
  language: 'ky' | 'ru';
  price: number;
  salesCount: number;
  categories: CategorySlug[];
  chapters: { title: string; seconds: number; free: boolean; chord: number[] }[];
}[] = [
  {
    slug: 'jamila-audio',
    title: 'Джамиля (аудиокнига)',
    author: 'Чингиз Айтматов',
    narrator: 'Демо-диктор',
    language: 'ru',
    price: som(450),
    salesCount: 12,
    categories: ['fiction', 'classics'],
    chapters: [
      {
        title: 'Глава 1. Аил у подножия гор',
        seconds: 24,
        free: true,
        chord: [261.63, 329.63, 392],
      },
      { title: 'Глава 2. Песня Данияра', seconds: 28, free: false, chord: [293.66, 369.99, 440] },
      {
        title: 'Глава 3. Дорога на станцию',
        seconds: 26,
        free: false,
        chord: [246.94, 311.13, 369.99],
      },
    ],
  },
  {
    slug: 'shakhmat-novellasy-audio',
    title: 'Шахмат новелласы (аудиокитеп)',
    author: 'Стефан Цвейг',
    narrator: 'Демо-окуучу',
    language: 'ky',
    price: som(400),
    salesCount: 7,
    categories: ['fiction', 'classics'],
    chapters: [
      {
        title: '1-бөлүм. Кемедеги жолугушуу',
        seconds: 22,
        free: true,
        chord: [220, 277.18, 329.63],
      },
      { title: '2-бөлүм. Чемпион', seconds: 25, free: false, chord: [196, 246.94, 293.66] },
    ],
  },
];

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of CATEGORIES) {
    const parentId = 'parentSlug' in category ? ids.get(category.parentSlug) : undefined;
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { name: category.name, slug: category.slug, sortOrder: category.sortOrder, parentId },
    });
    ids.set(category.slug, record.id);
  }
  return ids;
}

async function seedBooks(categoryIds: Map<string, string>): Promise<void> {
  for (const { categories, ...book } of BOOKS) {
    await prisma.book.upsert({
      where: { slug: book.slug },
      update: {},
      create: {
        ...book,
        publisher: 'OKU24 (демо)',
        description: `Демо-описание книги «${book.title}». Настоящее описание добавляется в админке.`,
        status: 'ACTIVE',
        bookCategories: {
          create: categories.map((slug) => ({ categoryId: categoryIds.get(slug)! })),
        },
      },
    });
  }
}

/** S3-клиент из переменных окружения или null, если хранилище не настроено. */
function storageClient(): { client: S3Client; bucket: string } | null {
  const bucket = process.env.S3_PRIVATE_BUCKET;
  if (!bucket || !process.env.S3_ACCESS_KEY_ID) {
    return null;
  }
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });
  return { client, bucket };
}

function ffmpegAvailable(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Демо-аудио: мягкий аккорд с плавным началом и концом. */
function demoMp3(dir: string, name: string, seconds: number, chord: number[]): Buffer {
  const file = join(dir, `${name}.mp3`);
  const inputs = chord.flatMap((frequency) => [
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=${frequency}:duration=${seconds}`,
  ]);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      ...inputs,
      '-filter_complex',
      `amix=inputs=${chord.length},volume=0.5,afade=t=in:d=2,afade=t=out:st=${seconds - 3}:d=3`,
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '64k',
      file,
    ],
    { stdio: 'ignore' },
  );
  return readFileSync(file);
}

async function seedAudiobooks(categoryIds: Map<string, string>): Promise<string> {
  const storage = storageClient();
  const canGenerate = storage !== null && ffmpegAvailable();
  const dir = mkdtempSync(join(tmpdir(), 'oku24-seed-'));

  if (storage && canGenerate) {
    try {
      await storage.client.send(new HeadBucketCommand({ Bucket: storage.bucket }));
    } catch {
      await storage.client.send(new CreateBucketCommand({ Bucket: storage.bucket }));
    }
  }

  try {
    for (const { categories, chapters, ...audiobook } of AUDIOBOOKS) {
      const chapterData = [];
      for (const [index, chapter] of chapters.entries()) {
        const storageKey = `audiobooks/chapters/demo/${audiobook.slug}-${index + 1}.mp3`;
        if (storage && canGenerate) {
          await storage.client.send(
            new PutObjectCommand({
              Bucket: storage.bucket,
              Key: storageKey,
              Body: demoMp3(dir, `${audiobook.slug}-${index + 1}`, chapter.seconds, chapter.chord),
              ContentType: 'audio/mpeg',
            }),
          );
        }
        chapterData.push({
          chapterNumber: index + 1,
          title: chapter.title,
          durationSeconds: chapter.seconds,
          isFreePreview: chapter.free,
          storageKey,
        });
      }

      await prisma.audiobook.upsert({
        where: { slug: audiobook.slug },
        update: {},
        create: {
          ...audiobook,
          description: `Демо-аудиокнига «${audiobook.title}». Первая глава доступна бесплатно.`,
          durationSeconds: chapterData.reduce((sum, c) => sum + c.durationSeconds, 0),
          status: 'ACTIVE',
          audioChapters: { create: chapterData },
          audiobookCategories: {
            create: categories.map((slug) => ({ categoryId: categoryIds.get(slug)! })),
          },
        },
      });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  return canGenerate
    ? 'демо-аудио загружено в хранилище'
    : 'демо-аудио пропущено (нужны ffmpeg и настроенное S3)';
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
  const categoryIds = await seedCategories();
  await seedBooks(categoryIds);
  const audio = await seedAudiobooks(categoryIds);
  console.log(
    `  категорий: ${CATEGORIES.length}, книг: ${BOOKS.length}, аудиокниг: ${AUDIOBOOKS.length}; ${audio}`,
  );

  console.log('Seed: пользователи...');
  await seedUser('SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'ADMIN', {
    firstName: 'Admin',
    lastName: 'OKU24',
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
