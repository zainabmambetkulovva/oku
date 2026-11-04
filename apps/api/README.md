# OKU_24 Backend API

NestJS Backend API для онлайн-магазина физических книг и аудиокниг OKU_24.

## Установка

```bash
pnpm install
```

## Конфигурация

Создайте файл `.env` в корневой директории проекта:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/okuu_24_dev?schema=public
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
```

Для production используйте реальные учетные данные PostgreSQL и правильные переменные окружения.

## Использование Prisma

```bash
# Генерация Prisma Client
pnpm prisma:generate

# Создание миграции
pnpm prisma:migrate-dev

# Применение миграций к production-базе
pnpm prisma:migrate-deploy

# Открытие Prisma Studio (база данных)
pnpm prisma:studio

# Запуск seed-файла
pnpm prisma:seed
```

## Запуск

```bash
# Разработка
pnpm start:dev

# Продакшн
pnpm start:prod
```

## Структура проекта

```
src/
├── main.ts                 # Точка входа
├── app.module.ts           # Корневой модуль
├── prisma/
│   ├── prisma.service.ts   # Сервис Prisma
│   └── seed.ts             # Данные для тестирования
└── modules/                # Модули приложения
    ├── auth/
    ├── users/
    ├── books/
    ├── audiobooks/
    ├── categories/
    ├── cart/
    ├── orders/
    ├── payments/
    ├── favorites/
    ├── reviews/
    ├── notifications/
    └── listening-progress/
```

## API Documentation

После запуска сервера доступна Swagger документация:
```
http://localhost:3000/api
```

## Тестирование

```bash
pnpm test
pnpm test:cov
```
