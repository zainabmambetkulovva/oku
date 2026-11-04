import { PrismaClient } from '@prisma/client';

/** Очищает все таблицы приложения (кроме истории миграций). */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) {
    return;
  }
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;
export const unique = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

export function createFactories(prisma: PrismaClient) {
  const user = () => prisma.user.create({ data: { email: `${unique('user')}@test.local` } });

  const book = (data: Partial<{ price: number; stockQuantity: number; title: string }> = {}) =>
    prisma.book.create({
      data: { title: 'Test book', author: 'Author', price: 50_000, slug: unique('book'), ...data },
    });

  const audiobook = () =>
    prisma.audiobook.create({
      data: { title: 'Test audiobook', author: 'Author', price: 30_000, slug: unique('audio') },
    });

  const order = (userId: string, data: { subtotal?: number; total?: number } = {}) =>
    prisma.order.create({
      data: {
        userId,
        orderNumber: unique('ORD'),
        subtotal: 50_000,
        total: 50_000,
        recipientName: 'Test Recipient',
        recipientPhone: '+996700000000',
        ...data,
      },
    });

  return { user, book, audiobook, order };
}
