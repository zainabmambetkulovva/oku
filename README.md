# OKU_24 — онлайн-магазин физических книг и аудиокниг

Платформа для продажи печатных книг и аудиокниг с интерактивной 3D-презентацией и встроенным аудиоплеером.

## Документация

- [Техническое задание](docs/technical-specification.md)
- [Спецификация базы данных](docs/database-specification.md)
- [Развёртывание](docs/deployment.md)

## Структура репозитория

```text
oku_24/
├── apps/
│   ├── api/              # NestJS Backend
│   └── web/              # Next.js Frontend (этап Ф1)
├── packages/
│   ├── types/            # Общие TypeScript-типы
│   ├── validators/       # Общие схемы валидации (Zod)
│   └── config/           # Общие константы и настройки
├── docker/               # Docker-конфигурации (локальные PostgreSQL и Redis)
├── docs/                 # Документация проекта
└── .github/workflows/    # CI
```

Monorepo управляется через pnpm Workspaces. Backend — Modular Monolith на NestJS + Prisma ORM, база данных — Neon PostgreSQL.

## Требования

- Node.js 22 (см. `.nvmrc`), минимум 20
- pnpm 10 (`corepack enable` установит нужную версию из `package.json`)
- Docker — для локальных PostgreSQL и Redis

## Быстрый старт

```bash
corepack enable
pnpm install                                   # также генерирует Prisma Client
cp apps/api/.env.example apps/api/.env         # заполнить переменные
pnpm docker:up                                 # PostgreSQL :5432 и Redis :6379
pnpm db:migrate:deploy                         # применить миграции
pnpm db:seed                                   # тестовые данные (необязательно)
pnpm dev:api                                   # http://localhost:3000/api/v1
```

Swagger-документация: http://localhost:3000/api/docs, проверка работоспособности: `GET /api/v1/health`.

## Команды

Все команды запускаются из корня репозитория.

| Команда | Что делает |
|---|---|
| `pnpm dev:api` | Backend в режиме разработки |
| `pnpm build` | Сборка всех пакетов и приложений |
| `pnpm lint` | ESLint + Prettier |
| `pnpm typecheck` | Проверка типов TypeScript |
| `pnpm test` | Unit-тесты |
| `pnpm test:integration` | Интеграционные и e2e-тесты (нужна тестовая база, см. ниже) |
| `pnpm format` | Форматирование кода |
| `pnpm docker:up` / `pnpm docker:down` | Запуск и остановка локальных PostgreSQL и Redis |
| `pnpm db:generate` | Генерация Prisma Client |
| `pnpm db:validate` | Проверка Prisma-схемы |
| `pnpm db:migrate:dev` | Создание и применение миграции (разработка) |
| `pnpm db:migrate:deploy` | Применение миграций (production) |
| `pnpm db:drift` | Проверка, что база совпадает со схемой |
| `pnpm db:seed` | Тестовые данные (только для разработки) |
| `pnpm db:studio` | Prisma Studio |

## Тесты

- **Unit-тесты** (`apps/api/src/**/*.spec.ts`) — без базы данных: `pnpm test`.
- **Интеграционные и e2e-тесты** (`apps/api/test/`) — на настоящей PostgreSQL. Тесты очищают таблицы, поэтому имя базы обязано оканчиваться на `_test`, иначе тесты не запустятся:

```bash
docker compose -f docker/docker-compose.yml exec postgres createdb -U oku oku_24_test
export DATABASE_URL="postgresql://oku:oku@localhost:5432/oku_24_test?schema=public"
export DIRECT_URL="$DATABASE_URL"
pnpm db:migrate:deploy
pnpm test:integration
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) на каждый push и pull request в `main` выполняет: установку зависимостей, проверку Prisma-схемы, lint, typecheck, unit-тесты, применение миграций к чистой базе, проверку соответствия миграций схеме, интеграционные и e2e-тесты, сборку.

## API

- Все маршруты — `/api/v1/...`.
- Успешный ответ: `{ "data": ..., "meta": ... }` (`meta` — только у списков с пагинацией).
- Ошибка: `{ "statusCode", "error", "message", "details"?, "path", "timestamp" }`.

### Авторизация

- Все маршруты закрыты по умолчанию; открытые (каталог, health, вход и регистрация) помечены `@Public()`.
- **Access-токен** (JWT, 15 минут) — в заголовке `Authorization: Bearer <token>`. Возвращается при регистрации, входе и обновлении.
- **Refresh-токен** — только в httpOnly cookie `oku_refresh` (путь `/api/v1/auth`). Frontend отправляет запросы с `credentials: 'include'`.
- `POST /auth/refresh` выдаёт новый access-токен и меняет refresh-токен. Повторное использование старого refresh-токена отзывает все сессии пользователя.
- Выход, блокировка пользователя и смена роли действуют сразу: при каждом запросе проверяется сессия и статус пользователя.
- После 5 неудачных попыток входа аккаунт блокируется на 15 минут.

| Маршрут | Доступ | Назначение |
|---|---|---|
| `POST /auth/register` | все | Регистрация, письмо для подтверждения почты |
| `POST /auth/login` | все | Вход |
| `POST /auth/refresh` | cookie | Новый access-токен |
| `POST /auth/logout` | cookie | Выход с текущего устройства |
| `POST /auth/logout-all` | авторизованный | Выход со всех устройств |
| `POST /auth/verify-email` | все | Подтверждение почты по токену из письма |
| `POST /auth/resend-verification` | авторизованный | Повторное письмо |
| `POST /auth/forgot-password` | все | Ссылка для сброса пароля (ответ одинаковый для любого e-mail) |
| `POST /auth/reset-password` | все | Новый пароль по токену, завершает все сессии |
| `GET/PATCH /users/me` | авторизованный | Профиль |
| `POST /users/me/password` | авторизованный | Смена пароля, завершает остальные сессии |
| `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:id` | авторизованный | Адреса доставки |

## Статус разработки

| Этап | Статус |
|---|---|
| Б1. Подготовка monorepo | ✅ |
| Б2. База данных и каркас API | ✅ |
| Б3. Авторизация, роли, пользователи | ✅ |
| Б4–Б8. Backend-модули | ⏳ |
| Ф1–Ф7. Frontend | ⏳ |
| Интеграция, тестирование, запуск | ⏳ |

## Лицензия

Proprietary — OKU_24
