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
| `DATABASE_URL` | Подключение к PostgreSQL (для Neon — с `?sslmode=require`) |
| `JWT_SECRET` | Секрет подписи JWT — длинная случайная строка |
| `JWT_EXPIRES_IN` | Срок жизни токена, например `7d` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | S3-совместимое хранилище |

На этапе Б2 добавится `DIRECT_URL` — прямое (без pooling) подключение Neon для миграций.

## Локальная разработка

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm docker:up
pnpm dev:api
```

## Neon PostgreSQL

1. Создать проект на https://neon.tech.
2. Скопировать строку подключения с connection pooling — это `DATABASE_URL`.
3. Скопировать прямую строку подключения — это `DIRECT_URL` (с этапа Б2).

## Миграции

```bash
pnpm db:migrate:deploy
```

Production-базу нельзя менять вручную — только через Prisma Migrations.

## Seed

`pnpm db:seed` создаёт тестовые категории и пользователей. Предназначен только для разработки, в production не запускать.

## Сборка и запуск backend

```bash
pnpm build
cd apps/api && pnpm start:prod     # node dist/main
```

## CI

Workflow `.github/workflows/ci.yml` проверяет каждый push и pull request в `main`: установка зависимостей → проверка Prisma-схемы → lint → typecheck → тесты → сборка.

Автоматический деплой (CD) добавляется на финальном этапе, после выбора хостинга.

## Мониторинг и резервное копирование

Настраиваются на финальном этапе: логирование ошибок, мониторинг работоспособности, автоматические бэкапы Neon.
