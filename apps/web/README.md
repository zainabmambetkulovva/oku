# OKU24 Frontend

Next.js (App Router) + React + TypeScript + Tailwind CSS + React Three Fiber.

## Запуск

```bash
# из корня репозитория; API должен работать на :3000 (pnpm dev:api)
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web            # http://localhost:3001 → /ky, /ru, /en
```

## Структура

```
src/
├── app/[locale]/           # Страницы. Язык — в адресе: /ky, /ru, /en
├── i18n/                   # Маршрутизация языков (next-intl)
├── components/
│   ├── layout/             # Шапка, подвал, логотип, меню, переключатель языка
│   ├── home/               # Блоки главной, 3D-сцена, аудиоплеер, подписка
│   ├── catalog/            # Карточки товаров, обложки, «В корзину», избранное
│   ├── ornaments/          # Кыргызский орнамент и горный пейзаж (SVG)
│   └── ui/                 # Кнопки, заголовки секций, иконки
├── lib/                    # Запросы к API, типы, форматирование цен
├── store/                  # Корзина и избранное гостя (Zustand, localStorage)
└── providers/              # TanStack Query
messages/                   # Тексты интерфейса: ky.json, ru.json, en.json
e2e/                        # Сквозные проверки (Playwright)
```

## Дизайн-система

- **Цвета** (`src/app/globals.css`): молочный фон, бежевые карточки, тёмно-зелёный и золото — по согласованному макету.
- **Шрифты**: Noto Serif Display (заголовки) и Manrope (текст). Оба поддерживают кыргызские буквы ң, ө, ү; подключены из npm (`@fontsource`), без запросов к Google Fonts.
- **Орнамент** «кочкор мүйүз» и горный пейзаж — собственные SVG.
- **Логотип** — `components/layout/logo.tsx`; знак на фиолетовом круге — иконка сайта (`app/icon.svg`).

## Цены

API отдаёт цены в тыйынах; на сайте — в сомах: `formatPrice(65000, 'ru')` → «650 сом».

## 3D

Сцена главной (`components/home/hero-books-3d.tsx`) загружается отдельно и только в браузере. Рендер останавливается, когда сцену не видно; при системной настройке «уменьшить движение» книги не двигаются; без WebGL показывается статичная стопка обложек.

## Тексты и языки

Все строки — в `messages/*.json`, ключи во всех трёх файлах одинаковые. Кыргызский перевод стоит проверить носителю языка.

## Проверки

```bash
pnpm --filter @oku_24/web lint
pnpm --filter @oku_24/web typecheck
pnpm --filter @oku_24/web test          # unit (Vitest)
pnpm test:e2e                            # сквозные (нужны запущенные API с seed и web)
```
