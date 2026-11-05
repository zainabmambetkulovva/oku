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
| `JWT_SECRET` | Секрет подписи access-токенов. В production — не короче 32 символов |
| `JWT_ACCESS_EXPIRES_IN` | Срок жизни access-токена: `15m`, `1h` и т.п. |
| `REFRESH_TOKEN_TTL_DAYS` | Срок жизни refresh-токена (сессии) в днях |
| `COOKIE_SECURE` | `true` — cookie только по HTTPS. В production обязательно `true` |
| `COOKIE_SAMESITE` | `lax` (по умолчанию), `strict` или `none`. `none` нужен, если frontend и API на разных доменах; требует `COOKIE_SECURE=true` |
| `FRONTEND_URL` | Адрес frontend — для ссылок в письмах |
| `CORS_ORIGINS` | Адреса frontend через запятую, которым разрешены запросы к API |
| `THROTTLE_TTL_MS`, `THROTTLE_LIMIT` | Ограничение частоты запросов: не больше `LIMIT` запросов за `TTL` мс с одного IP |
| `AUTH_THROTTLE_TTL_MS`, `AUTH_THROTTLE_LIMIT` | Более строгий лимит для входа, регистрации и восстановления пароля |
| `MAIL_TRANSPORT` | `log` — письма в лог (разработка), `smtp` — отправка через SMTP |
| `MAIL_FROM` | Отправитель писем, например `OKU_24 <no-reply@oku24.kg>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Параметры SMTP-сервера. `SMTP_HOST` обязателен при `MAIL_TRANSPORT=smtp` |
| `SWAGGER_ENABLED` | `true` / `false` — публиковать ли документацию на `/api/docs` |
| `S3_ENDPOINT` | Адрес S3-совместимого сервиса. Пустой — AWS S3. Для Cloudflare R2, Yandex Object Storage и т.п. — их адрес |
| `S3_REGION` | Регион (`us-east-1`, `auto` для R2, `ru-central1` для Yandex) |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Ключи доступа к хранилищу |
| `S3_PUBLIC_BUCKET` | Бакет для обложек и изображений — открыт на чтение, за CDN |
| `S3_PRIVATE_BUCKET` | Бакет для аудиофайлов — закрыт, файлы выдаются только по подписанным ссылкам |
| `S3_FORCE_PATH_STYLE` | `true` для SeaweedFS/MinIO и некоторых провайдеров |
| `S3_CREATE_BUCKETS` | `true` — создавать бакеты при старте (только разработка) |
| `MEDIA_PUBLIC_BASE_URL` | Адрес, по которому браузер получает файлы публичного бакета — адрес CDN |
| `REDIS_URL` | Redis для кэша каталога. Пустой — кэш отключён |
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

## Файловое хранилище и CDN

Провайдер для production выбирается к запуску. Подойдёт любой S3-совместимый: AWS S3, Cloudflare R2, Yandex Object Storage и т.п.

1. Создать два бакета: публичный (обложки) и закрытый (аудио).
2. Публичный бакет: разрешить анонимное чтение и поставить перед ним CDN; адрес CDN — в `MEDIA_PUBLIC_BASE_URL`.
3. Закрытый бакет: без публичного доступа.
4. Для загрузки из браузера разрешить CORS на публичном и закрытом бакетах: метод `POST`, origin — адрес админки.
5. Создать ключи доступа только к этим двум бакетам.

Локально вместо S3 работает SeaweedFS из `docker/docker-compose.yml` (`http://localhost:8333`), учётные данные — `docker/seaweedfs/s3.json`.

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
