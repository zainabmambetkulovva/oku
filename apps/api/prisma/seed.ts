import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Создание ролей (в PostgreSQL через enum не требуется, просто в коде)
  console.log('Creating initial data...');

  // 2. Создание категорий
  const techCategory = await prisma.category.upsert({
    where: { slug: 'technology' },
    update: {},
    create: {
      name: 'Technology',
      slug: 'technology',
      description: 'Books about technology, programming, and computer science',
      isActive: true,
      sortOrder: 1,
    },
  });

  const fictionCategory = await prisma.category.upsert({
    where: { slug: 'fiction' },
    update: {},
    create: {
      name: 'Fiction',
      slug: 'fiction',
      description: 'Fiction books and novels',
      isActive: true,
      sortOrder: 2,
    },
  });

  const programmingSubcategory = await prisma.category.upsert({
    where: { slug: 'programming-languages' },
    update: {},
    create: {
      name: 'Programming Languages',
      slug: 'programming-languages',
      description: 'Books about programming languages',
      parentId: techCategory.id,
      isActive: true,
      sortOrder: 1,
    },
  });

  const frontendSubcategory = await prisma.category.upsert({
    where: { slug: 'frontend-development' },
    update: {},
    create: {
      name: 'Frontend Development',
      slug: 'frontend-development',
      description: 'Books about frontend development',
      parentId: techCategory.id,
      isActive: true,
      sortOrder: 2,
    },
  });

  console.log('Categories created:', {
    tech: techCategory.slug,
    fiction: fictionCategory.slug,
    programming: programmingSubcategory.slug,
    frontend: frontendSubcategory.slug,
  });

  // 3. Создание пользователя с ролью ADMIN
  const adminPasswordHash = await hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@okuu24.kg' },
    update: {},
    create: {
      email: 'admin@okuu24.kg',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  // 4. Создание обычного пользователя
  const userPasswordHash = await hash('user123', 10);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@okuu24.kg' },
    update: {},
    create: {
      email: 'user@okuu24.kg',
      passwordHash: userPasswordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('Users created:', {
    admin: adminUser.email,
    user: regularUser.email,
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
