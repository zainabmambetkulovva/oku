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
├── app.module.ts           # Корневой модуль: конфигурация, глобальные pipe/filter/interceptor/guard
├── app.setup.ts            # Префикс /api/v1, helmet, CORS, Swagger
├── config/env.ts           # Проверка переменных окружения
├── common/
│   ├── decorators/         # @AuthUser()
│   ├── filters/            # Единый формат ошибок
│   ├── interceptors/       # Единый формат ответов { data, meta }
│   ├── pipes/              # Валидация входных данных
│   └── http/               # Типы ответов API
├── prisma/                 # Глобальный PrismaModule и PrismaService
└── modules/
    ├── health/
    ├── auth/
    ├── books/
    ├── categories/
    ├── cart/
    └── orders/
prisma/
├── schema.prisma           # Схема базы данных
├── migrations/             # Миграции (CHECK-ограничения — в *_init/migration.sql)
└── seed.ts                 # Тестовые данные (только для разработки)
test/
├── integration/            # Ограничения базы данных на настоящей PostgreSQL
├── e2e/                    # HTTP-тесты приложения
└── helpers/
```

Остальные модули из ТЗ (users, audiobooks, payments, favorites, reviews, notifications,
listening-progress, admin, analytics) добавляются на этапах Б3–Б8.

## API Documentation

После запуска сервера доступна Swagger документация:
```
http://localhost:3000/api/docs
```

## Тестирование

```bash
pnpm test               # unit-тесты
pnpm test:cov
pnpm test:integration   # интеграционные и e2e (база с именем *_test, см. корневой README)
```
