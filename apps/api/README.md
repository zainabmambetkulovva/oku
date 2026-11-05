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
│   ├── auth/               # Тип пользователя запроса
│   ├── decorators/         # @AuthUser(), @Public(), @Roles()
│   ├── guards/             # JwtAuthGuard (все маршруты закрыты по умолчанию), RolesGuard
│   ├── throttle/           # Строгий лимит для маршрутов авторизации
│   ├── validation/         # Общие правила валидации (e-mail, пароль, телефон)
│   ├── pagination/         # page/limit и формат { data, meta }
│   ├── utils/              # slug, ключи кэша
│   ├── filters/            # Единый формат ошибок
│   ├── interceptors/       # Единый формат ответов { data, meta }
│   ├── pipes/              # Валидация входных данных
│   └── http/               # Типы ответов API
├── prisma/                 # Глобальный PrismaModule и PrismaService
└── modules/
    ├── health/
    ├── mail/               # Отправка писем (лог или SMTP)
    ├── storage/            # S3-хранилище, загрузка файлов по подписанной форме
    ├── cache/              # Кэш каталога в Redis
    ├── audit/              # Журнал действий администраторов
    ├── catalog/            # Общее для каталога: фильтры, сортировка, языки
    ├── categories/         # Дерево категорий, админка категорий
    ├── books/              # Каталог книг, админка книг
    ├── audiobooks/         # Каталог аудиокниг, админка аудиокниг и глав
    ├── listening/          # Доступ к аудио, ссылки на файлы, прогресс, «мои аудиокниги»
    ├── cart/               # Корзина
    ├── orders/             # Заказы: оформление, статусы, доставка, отмена неоплаченных
    ├── payments/           # Платежи: Finik, тестовый провайдер, вебхуки
    ├── auth/               # Регистрация, вход, токены, сессии, почта, сброс пароля
    ├── users/              # Профиль, смена пароля, адреса

prisma/
├── schema.prisma           # Схема базы данных
├── migrations/             # Миграции (CHECK-ограничения — в *_init/migration.sql)
└── seed.ts                 # Тестовые данные (только для разработки)
test/
├── integration/            # Ограничения базы данных на настоящей PostgreSQL
├── e2e/                    # HTTP-тесты приложения
└── helpers/
```

Остальные модули из ТЗ (favorites, reviews, notifications, admin, analytics)
добавляются на этапах Б7–Б8.

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
