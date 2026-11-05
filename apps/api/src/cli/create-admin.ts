/**
 * Первоначальная настройка: назначает администратора (спецификация БД, п. 3.2).
 * Через API назначить себя администратором нельзя — только этой командой на сервере.
 *
 *   pnpm admin:create --email owner@oku24.kg                      # существующий пользователь
 *   pnpm admin:create --email owner@oku24.kg --password 'Secret123' # создать нового
 *
 * В production (после сборки): node dist/cli/create-admin.js --email ...
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export interface CreateAdminResult {
  email: string;
  created: boolean;
}

export async function createAdmin(
  prisma: PrismaClient,
  options: { email: string; password?: string },
): Promise<CreateAdminResult> {
  const email = options.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid e-mail: ${options.email}`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
    });
    return { email, created: false };
  }

  if (!options.password) {
    throw new Error(`User ${email} not found: register first or pass --password`);
  }
  const password = options.password;
  if (password.length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
    throw new Error('Password must be at least 8 characters and contain a letter and a digit');
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(password, BCRYPT_ROUNDS),
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  return { email, created: true };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = argument('email');
  if (!email) {
    throw new Error('Usage: admin:create --email <email> [--password <password>]');
  }
  const prisma = new PrismaClient();
  try {
    const result = await createAdmin(prisma, { email, password: argument('password') });
    console.log(
      result.created
        ? `Administrator ${result.email} created`
        : `User ${result.email} is now an administrator`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
