# Deployment Guide for OKU_24

## Требования

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL (Neon PostgreSQL recommended)

## Установка

```bash
pnpm install
```

## Настройка базы данных

### 1. Создайте базу данных на Neon PostgreSQL

1. Перейдите на https://neon.tech
2. Создайте новый проект
3. Скопируйте строку подключения (DATABASE_URL)

### 2. Настройте переменные окружения

Создайте файл `.env` в `apps/api/`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.neon.tech/okuu_24?sslmode=require
NODE_ENV=production
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=okuu-24
```

### 3. Выполните миграции

```bash
cd apps/api
npx prisma migrate deploy
```

### 4. Запустите seed (опционально)

```bash
npx prisma db seed
```

## Запуск приложения

### Development

```bash
cd apps/api
npx nest start --watch
```

### Production

```bash
cd apps/api
npm run build
node dist/apps/api/main
```

## CI/CD

Для автоматизации используйте GitHub Actions:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Run migrations
        run: cd apps/api && npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Build and deploy
        run: cd apps/api && npm run build && node dist/apps/api/main
```

## Мониторинг

- Логи: Проверяйте консоль или используйте лог-менеджер
- Метрики: Рассмотрите использование Prometheus + Grafana
- Бэкапы: Настройте автоматические бэкапы на Neon
