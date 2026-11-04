# OKU_24 Backend API

NestJS Backend API для онлайн-магазина физических книг и аудиокниг OKU_24.

## Установка

```bash
pnpm install
```

## Конфигурация

Скопируйте шаблон и заполните переменные (описание — в `docs/deployment.md`):

```bash
cp .env.example .env
```

## Использование Prisma

```bash
# Генерация Prisma Client
pnpm prisma:generate

# Создание миграции
pnpm prisma:migrate-dev

# Проверка схемы
pnpm prisma:validate

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
├── common/                 # Общие декораторы, guards, фильтры
├── prisma/                 # PrismaModule и PrismaService
└── modules/                # Модули приложения
    ├── auth/
    ├── books/
    ├── categories/
    ├── cart/
    └── orders/
prisma/
├── schema.prisma           # Схема базы данных
└── seed.ts                 # Тестовые данные (только для разработки)
```

Остальные модули из ТЗ (users, audiobooks, payments, favorites, reviews, notifications,
listening-progress, admin, analytics) добавляются на этапах Б3–Б8.

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
