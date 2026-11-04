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
pnpm dev:api                                   # http://localhost:3000, Swagger — /api
```

Миграции базы данных появятся на этапе Б2.

## Команды

Все команды запускаются из корня репозитория.

| Команда | Что делает |
|---|---|
| `pnpm dev:api` | Backend в режиме разработки |
| `pnpm build` | Сборка всех пакетов и приложений |
| `pnpm lint` | ESLint + Prettier |
| `pnpm typecheck` | Проверка типов TypeScript |
| `pnpm test` | Тесты |
| `pnpm format` | Форматирование кода |
| `pnpm docker:up` / `pnpm docker:down` | Запуск и остановка локальных PostgreSQL и Redis |
| `pnpm db:generate` | Генерация Prisma Client |
| `pnpm db:validate` | Проверка Prisma-схемы |
| `pnpm db:migrate:dev` | Создание и применение миграции (разработка) |
| `pnpm db:migrate:deploy` | Применение миграций (production) |
| `pnpm db:seed` | Тестовые данные (только для разработки) |
| `pnpm db:studio` | Prisma Studio |

## CI

GitHub Actions (`.github/workflows/ci.yml`) на каждый push и pull request в `main` выполняет: установку зависимостей, проверку Prisma-схемы, lint, typecheck, тесты и сборку.

## Статус разработки

| Этап | Статус |
|---|---|
| Б1. Подготовка monorepo | ✅ |
| Б2. База данных и каркас API | ⏳ |
| Б3–Б8. Backend-модули | ⏳ |
| Ф1–Ф7. Frontend | ⏳ |
| Интеграция, тестирование, запуск | ⏳ |

## Лицензия

Proprietary — OKU_24
