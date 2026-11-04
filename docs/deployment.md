# Развёртывание OKU_24

> Production-развёртывание (хостинг, Docker-образы, CDN, мониторинг) настраивается на финальном этапе.
> Здесь описано текущее состояние.

## Требования

- Node.js 22 (минимум 20)
- pnpm 10
- PostgreSQL — Neon PostgreSQL для production, Docker-контейнер для разработки

## Переменные окружения

Backend читает `apps/api/.env`. Шаблон — `apps/api/.env.example`. Файлы `.env` не коммитятся; секреты production хранятся только в переменных окружения хостинга и в GitHub Secrets.

| Переменная | Назначение |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | Порт HTTP-сервера |
| `DATABASE_URL` | Подключение к PostgreSQL для работы приложения. Neon — строка с connection pooling и `?sslmode=require` |
| `DIRECT_URL` | Прямое подключение (без pooling) — используется для миграций. Локально совпадает с `DATABASE_URL` |
| `JWT_SECRET` | Секрет подписи JWT. В production — не короче 32 символов |
| `JWT_EXPIRES_IN` | Срок жизни токена, например `7d` |
| `CORS_ORIGINS` | Адреса frontend через запятую, которым разрешены запросы к API |
| `THROTTLE_TTL_MS`, `THROTTLE_LIMIT` | Ограничение частоты запросов: не больше `LIMIT` запросов за `TTL` мс с одного IP |
| `SWAGGER_ENABLED` | `true` / `false` — публиковать ли документацию на `/api/docs` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | S3-совместимое хранилище (этап Б4) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | Пользователи для `pnpm db:seed`, только разработка |

Переменные проверяются при старте: если чего-то не хватает или значение некорректно, приложение не запустится и выведет список проблем.

## Локальная разработка

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:api
```

## Neon PostgreSQL

1. Создать проект на https://neon.tech.
2. Скопировать строку подключения с connection pooling — это `DATABASE_URL`.
3. Скопировать прямую строку подключения — это `DIRECT_URL`.
4. Расширение `pg_trgm` (поиск по названию и автору) создаётся первой миграцией автоматически.

## Миграции

```bash
pnpm db:migrate:deploy
```

Production-базу нельзя менять вручную — только через Prisma Migrations.

CHECK-ограничения (цены, остатки, рейтинг и т.д.) Prisma не описывает в схеме — они добавлены SQL-кодом в миграцию `prisma/migrations/*_init`. Prisma их не удаляет при следующих миграциях. Проверить, что база совпадает со схемой: `pnpm db:drift`.

## Seed

`pnpm db:seed` создаёт тестовые категории, книги и аудиокнигу. Пользователи создаются, только если заданы переменные `SEED_*`. В production seed отказывается запускаться.

## Сборка и запуск backend

```bash
pnpm build
cd apps/api && pnpm start:prod     # node dist/main
```

## CI

Workflow `.github/workflows/ci.yml` проверяет каждый push и pull request в `main`: установка зависимостей → проверка Prisma-схемы → lint → typecheck → unit-тесты → миграции на чистой PostgreSQL → проверка соответствия миграций схеме → интеграционные и e2e-тесты → сборка.

Автоматический деплой (CD) добавляется на финальном этапе, после выбора хостинга.

## Мониторинг и резервное копирование

Настраиваются на финальном этапе: логирование ошибок, мониторинг работоспособности, автоматические бэкапы Neon.
