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
| `SWAGGER_ENABLED` | `true` / `false` — публиковать ли документацию на `/api/docs`. Не задано — включена везде, кроме `NODE_ENV=production` |
| `S3_ENDPOINT` | Адрес S3-совместимого сервиса. Пустой — AWS S3. Для Cloudflare R2, Yandex Object Storage и т.п. — их адрес |
| `S3_REGION` | Регион (`us-east-1`, `auto` для R2, `ru-central1` для Yandex) |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Ключи доступа к хранилищу |
| `S3_PUBLIC_BUCKET` | Бакет для обложек и изображений — открыт на чтение, за CDN |
| `S3_PRIVATE_BUCKET` | Бакет для аудиофайлов — закрыт, файлы выдаются только по подписанным ссылкам |
| `S3_FORCE_PATH_STYLE` | `true` для SeaweedFS/MinIO и некоторых провайдеров |
| `S3_CREATE_BUCKETS` | `true` — создавать бакеты при старте (только разработка) |
| `MEDIA_PUBLIC_BASE_URL` | Адрес, по которому браузер получает файлы публичного бакета — адрес CDN |
| `REDIS_URL` | Redis для кэша каталога. Пустой — кэш отключён |
| `API_PUBLIC_URL` | Публичный адрес API (`https://api.<домен>`) — из него строится адрес вебхука платёжной системы |
| `DELIVERY_PRICE_COURIER`, `DELIVERY_PRICE_POST` | Цена доставки курьером и почтой, тыйын. Самовывоз бесплатный |
| `ORDER_PAYMENT_TTL_MINUTES` | Минут на оплату онлайн-заказа (по умолчанию 10) |
| `JOBS_ENABLED` | Фоновые задачи: отмена неоплаченных заказов раз в минуту |
| `ROLE_MANAGER_EMAILS` | Email через запятую — только эти администраторы назначают и снимают роли |
| `LOW_STOCK_THRESHOLD` | Порог «заканчивается на складе» на dashboard (по умолчанию 3) |
| `PAYMENT_PROVIDER` | `finik` в production; `test` — тестовый провайдер для разработки (в production запрещён) |
| `TEST_PAYMENT_SECRET` | Секрет подписи вебхуков тестового провайдера |
| `FINIK_ENV`, `FINIK_API_KEY`, `FINIK_ACCOUNT_ID`, `FINIK_PRIVATE_KEY`, `FINIK_PUBLIC_KEY`, `FINIK_WEBHOOK_HOST` | Подключение Finik — см. [payments-finik.md](payments-finik.md) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | Пользователи для `pnpm db:seed`, только разработка |

Переменные проверяются при старте: если чего-то не хватает или значение некорректно, приложение не запустится и выведет список проблем.

### Frontend (`apps/web`)

| Переменная | Назначение |
|---|---|
| `API_URL` | Адрес API для запросов с сервера Next.js, например `http://api:3000/api/v1`. На Vercel не задаётся (см. ниже) |
| `NEXT_PUBLIC_API_URL` | Адрес API для браузера, например `https://api.oku24.kg/api/v1`. Встраивается при сборке — задать до `pnpm build`. На Vercel не задаётся: без него браузер ходит на `/api/v1` своего домена |
| `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL` | Контакты в подвале; пустые не показываются |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Instagram (по умолчанию @oku_24) |

Адрес сайта нужно добавить в `CORS_ORIGINS` и `FRONTEND_URL` API.

## Vercel (один проект, два сервиса)

`vercel.json` в корне описывает проект Vercel с сервисами:

| Сервис | Папка | Фреймворк | Публичный путь |
| --- | --- | --- | --- |
| `api` | `apps/api` | NestJS | `/api/*` (все маршруты API — `/api/v1/...`, Swagger — `/api/docs`) |
| `web` | `apps/web` | Next.js | всё остальное (`/(.*)`) |

- Сайт и API работают на одном домене, поэтому браузер обращается к `/api/v1` без CORS, а refresh-cookie остаётся first-party.
- Сервис `web` вызывает `api` с сервера через binding: Vercel подставляет внутренний адрес сервиса в `API_SERVICE_URL` во время выполнения функций (не при сборке и не в middleware). Сам эту переменную не задавать.
- Переменные backend из таблицы выше задаются в настройках проекта Vercel. Для production: `FRONTEND_URL` и `CORS_ORIGINS` — адрес сайта, `COOKIE_SECURE=true`, `JOBS_ENABLED=false` (см. ниже), внешние PostgreSQL (Neon), S3 и Redis.
- Фоновая задача отмены неоплаченных заказов (`@nestjs/schedule`) в serverless-функциях не выполняется по расписанию; для Vercel её нужно перевести на Vercel Cron.
- Миграции не запускаются при деплое: `pnpm db:migrate:deploy` выполняется отдельно перед выкладкой.
- Локальная проверка всех сервисов вместе: `vercel dev` из корня репозитория.

### Первый деплой: пошагово (Vercel + Neon + AWS S3 + Finik)

Ключи и пароли вводятся только в панели Vercel (Project → Settings → Environment Variables), не в коде и не в чатах. Ниже `SITE` — адрес сайта на Vercel, например `https://oku24.vercel.app` (позже — свой домен).

**1. AWS S3 (регион, например, `eu-central-1` — Франкфурт)**

1. Создать публичный бакет для обложек (например, `oku24-media`): снять «Block all public access» и добавить bucket policy на чтение:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::oku24-media/*"
       }
     ]
   }
   ```
2. Создать закрытый бакет для аудио (например, `oku24-audio`) — «Block all public access» оставить включённым.
3. На обоих бакетах (Permissions → CORS) разрешить загрузку из браузера и воспроизведение:
   ```json
   [
     {
       "AllowedOrigins": ["SITE"],
       "AllowedMethods": ["GET", "HEAD", "POST"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length", "Content-Range"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. IAM → создать пользователя `oku24-api` без доступа к консоли, с политикой только на эти бакеты, и выпустить для него Access key:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject"],
         "Resource": ["arn:aws:s3:::oku24-media/*", "arn:aws:s3:::oku24-audio/*"]
       },
       {
         "Effect": "Allow",
         "Action": "s3:ListBucket",
         "Resource": ["arn:aws:s3:::oku24-media", "arn:aws:s3:::oku24-audio"]
       }
     ]
   }
   ```
5. Переменные: `S3_REGION=eu-central-1`, `S3_PUBLIC_BUCKET=oku24-media`, `S3_PRIVATE_BUCKET=oku24-audio`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL=https://oku24-media.s3.eu-central-1.amazonaws.com`. `S3_ENDPOINT` не задавать, `S3_FORCE_PATH_STYLE=false` (значение по умолчанию). Позже перед публичным бакетом можно поставить CloudFront и указать его адрес в `MEDIA_PUBLIC_BASE_URL`.

**2. Neon**

Проект в том же регионе (AWS Frankfurt). Строка с pooler → `DATABASE_URL`, прямая строка → `DIRECT_URL`.

**3. Миграции — кнопкой в GitHub**

1. GitHub → репозиторий → Settings → Secrets and variables → Actions → New repository secret:
   - `PROD_DATABASE_URL` — строка Neon с pooler;
   - `PROD_DIRECT_URL` — прямая строка Neon;
   - `ADMIN_INITIAL_PASSWORD` — пароль первого администратора (не короче 8 символов, буквы и цифры).
2. Actions → **Production database** → Run workflow → `task: migrate` → Run. В конце лога: `Database schema is up to date!`.
3. `task: status` только показывает состояние миграций, ничего не меняя.

Миграции запускаются вручную перед выкладкой и после каждого изменения схемы. Seed в production не запускается.

**4. Vercel**

1. Add New → Project → импортировать репозиторий `oku`. Root Directory — корень репозитория (там `vercel.json`).
2. Settings → Functions → Region: тот же регион, что у Neon и S3 (Frankfurt, `fra1`).
3. Environment Variables (Production):

   | Группа | Переменные |
   | --- | --- |
   | База | `DATABASE_URL`, `DIRECT_URL` |
   | Вход | `JWT_SECRET` (случайная строка от 32 символов), `COOKIE_SECURE=true` |
   | Адреса | `FRONTEND_URL=SITE`, `CORS_ORIGINS=SITE`, `API_PUBLIC_URL=SITE` |
   | Хранилище | переменные из шага 1 |
   | Оплата | `PAYMENT_PROVIDER=finik`, `FINIK_ENV` (`beta` для проверки, затем `prod`), `FINIK_API_KEY`, `FINIK_ACCOUNT_ID`, `FINIK_PRIVATE_KEY`, `FINIK_PUBLIC_KEY` |
   | Роли | `ROLE_MANAGER_EMAILS` |
   | Прочее | `JOBS_ENABLED=false` |
   | Почта (по желанию) | `MAIL_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` |

   `API_SERVICE_URL`, `API_URL` и `NEXT_PUBLIC_API_URL` не задавать. Swagger в production выключен по умолчанию.
4. Deploy.

**5. Finik**

В кабинете Finik указать адрес вебхука `SITE/api/v1/payments/webhooks/finik`.

**6. Первый администратор**

Actions → **Production database** → Run workflow → `task: create-admin`, `admin_email` — email администратора. Если пользователь с этим email ещё не зарегистрирован, он создаётся с паролем из секрета `ADMIN_INITIAL_PASSWORD`; если зарегистрирован — получает роль ADMIN, пароль не меняется. Так же назначить email менеджера ролей (`ROLE_MANAGER_EMAILS`). После первого входа пароль лучше сменить.

**7. Проверка**

- `SITE` открывает главную, переключение языков работает.
- `SITE/api/v1/health` отвечает `"database":"up"`.
- `SITE/api/docs` — 404 (Swagger выключен).

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
4. Для загрузки из браузера разрешить CORS на публичном и закрытом бакетах: метод `POST`, origin — адрес админки. Для воспроизведения аудио на закрытом бакете — метод `GET` (и заголовок `Range`), origin — адрес сайта.
5. Создать ключи доступа только к этим двум бакетам.

Локально вместо S3 работает SeaweedFS из `docker/docker-compose.yml` (`http://localhost:8333`), учётные данные — `docker/seaweedfs/s3.json`.

## Миграции

```bash
pnpm db:migrate:deploy
```

Production-базу нельзя менять вручную — только через Prisma Migrations. Для Neon миграции запускаются кнопкой: Actions → **Production database** → `migrate`.

CHECK-ограничения (цены, остатки, рейтинг и т.д.) Prisma не описывает в схеме — они добавлены SQL-кодом в миграцию `prisma/migrations/*_init`. Prisma их не удаляет при следующих миграциях. Проверить, что база совпадает со схемой: `pnpm db:drift`.

## Первые администраторы

Назначить администратора через API нельзя — только командой на сервере:

```bash
# разработка
pnpm admin:create --email owner@oku24.kg --password 'StrongPass123'
# production (после сборки), из apps/api
node dist/cli/create-admin.js --email owner@oku24.kg --password 'StrongPass123'
```

Без `--password` команда делает администратором уже зарегистрированного пользователя. Пароль можно передать через переменную `ADMIN_PASSWORD` вместо аргумента.

Для production-базы на Neon то же самое делает кнопка в GitHub: Actions → **Production database** → `create-admin` (см. «Первый деплой: пошагово»).

Роли распределены так:

- **главный администратор** — управляет магазином (товары, заказы, пользователи, отзывы);
- **менеджер ролей** — email из `ROLE_MANAGER_EMAILS`; тоже администратор, и только он может назначать и снимать роль ADMIN (`PATCH /api/v1/admin/users/:id/role`). Свою роль изменить нельзя.

Пример: `admin:create` для `admin@oku24.kg` и `roles@oku24.kg`, в `.env` — `ROLE_MANAGER_EMAILS=roles@oku24.kg`.

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
