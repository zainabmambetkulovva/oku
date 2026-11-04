# OKU_24 — Онлайн-магазин физических книг и аудиокниг

Современная платформа для продажи книг и аудиокниг с интерактивной 3D-презентацией и полноценным аудиоплеером.

## Архитектура

Проект разработан в формате Monorepo:

```
oku_24/
├── apps/
│   ├── web/       # Next.js Frontend (не реализовано)
│   └── api/       # NestJS Backend (создано)
├── packages/
│   ├── types/     # Общие TypeScript-типы (не реализовано)
│   ├── validators/# Общие схемы валидации (не реализовано)
│   └── config/    # Общие настройки (не реализовано)
└── docker/        # Docker-конфигурации
```

## Технологический стек

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, React Three Fiber
- **Backend:** NestJS, Node.js, TypeScript, Prisma ORM
- **Database:** Neon PostgreSQL
- **Storage:** S3 Storage для медиафайлов

## Установка

```bash
pnpm install
```

## Команды для разработки

### Backend (NestJS)

```bash
cd apps/api

# Установка зависимостей
pnpm install

# Создание миграции Prisma
npx prisma migrate dev --name <migration_name>

# Применение миграций
npx prisma migrate deploy

# Генерация Prisma Client
npx prisma generate

# Открытие Prisma Studio
npx prisma studio

# Запуск в режиме разработки
npx nest start --watch

# Сборка для продакшена
npm run build
node dist/apps/api/main
```

## Структура базы данных

См. `DATABASEokuu-24.md` для полной спецификации.

Основные сущности:
- Users — Пользователи
- Books — Физические книги
- Audiobooks — Аудиокниги
- Categories — Категории
- Cart — Корзина
- Orders — Заказы
- Payments — Платежи
- AudioAccess — Доступ к аудиокнигам
- Favorites — Избранное
- Reviews — Отзывы

## Требования

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL (Neon PostgreSQL)

## Настройка DATABASE_URL

Для работы необходимо указать переменную DATABASE_URL в файле `apps/api/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/okuu_24_dev?schema=public
```

Для production используйте строку подключения Neon PostgreSQL:

```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.neon.tech/okuu_24?sslmode=require
```

## Миграции

После изменения схемы в `prisma/schema.prisma`:

```bash
cd apps/api
npx prisma migrate dev --name <description>
npx prisma migrate deploy
```

## Лицензия

Proprietary — OKU_24
