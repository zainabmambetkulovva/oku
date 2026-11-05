# Подключение Finik

[Finik](https://www.finik.kg/) — платёжный сервис Кыргызстана: оплата через приложение-кошелёк или QR.
В OKU_24 он подключён как провайдер `finik` (`apps/api/src/modules/payments/providers/finik.provider.ts`).

## Что реализовано

| Часть | Как сделано |
|---|---|
| Создание платежа | `POST https://<host>/v1/payment`, ссылка на оплату — из заголовка `Location` (или поля `paymentUrl` в JSON) |
| Среды | beta — `beta.api.acquiring.averspay.kg`, prod — `api.acquiring.averspay.kg` (`FINIK_ENV`) |
| Тело запроса | `Amount` (в сомах), `CardType: "FINIK_QR"`, `PaymentId` (наш id платежа), `RedirectUrl`, `Data.accountId`, `Data.name_en`, `Data.webhookUrl`, `Data.additionalData` (наши `paymentId` и `orderNumber`) |
| Подпись запросов | Заголовки `x-api-key`, `x-api-timestamp`, `signature`. RSA-SHA256 закрытым ключом магазина по каноничной строке (метод, путь, `host` + `x-api-*`, query, JSON с отсортированными ключами) |
| Вебхук | `POST /api/v1/payments/webhooks/finik`. Подпись из заголовка `signature` проверяется публичным ключом Finik |
| Результат оплаты | `status` (`SUCCEEDED` и др.), `amount` (в сомах), `transactionId`, `id`, `fields.paymentId` — наш платёж |
| Повторы | Событие (`id` или `transactionId`) обрабатывается один раз |

Алгоритм подписи проверен на эталонных данных библиотеки разработчиков Finik `@mancho.devs/authorizer`: каноничная строка и подпись совпадают до байта (`request-signer.spec.ts`).

## Важно перед запуском

Официальная документация Finik (`finik.kg/en/documentation`) была недоступна из среды разработки. Формат запросов и вебхуков собран по библиотеке подписи Finik и нескольким независимым открытым интеграциям. **Перед приёмом реальных платежей сверьте с официальной документацией Finik:**

1. Единица суммы `Amount` — сомы (мы отправляем `total / 100`, например `650.5`).
2. Название поля `Data.name_en`.
3. Есть ли в вебхуке наш `paymentId` — в `fields.paymentId` (из `additionalData`) или в `PaymentId`.
4. С каким `Host` Finik подписывает вебхук — по умолчанию проверяем с host из `API_PUBLIC_URL`, иначе задайте `FINIK_WEBHOOK_HOST`.
5. Отправляет ли Finik вебхук при неуспешной оплате. Если только при успешной — ничего менять не нужно: неоплаченные заказы отменяются сами через `ORDER_PAYMENT_TTL_MINUTES`.
6. API возврата. Его в коде нет: возврат делается в кабинете Finik, а в OKU_24 отмечается администратором (этап Б8).

## Что нужно получить от Finik

1. **API-ключ** (`x-api-key`) → `FINIK_API_KEY`.
2. **accountId** — счёт, на который зачисляются деньги → `FINIK_ACCOUNT_ID`.
3. **Зарегистрировать публичный ключ магазина.** Сгенерировать пару ключей:

   ```bash
   openssl genrsa -out finik_private.pem 2048
   openssl rsa -in finik_private.pem -pubout -out finik_public.pem
   ```

   `finik_public.pem` передать в Finik. Содержимое `finik_private.pem` → `FINIK_PRIVATE_KEY` (одной строкой, переводы строк — `\n`). Закрытый ключ не коммитить и никому не передавать.
4. **Публичный ключ Finik** для проверки вебхуков — свой для beta и prod, из документации Finik → `FINIK_PUBLIC_KEY`.
5. **Адрес вебхука**: `https://<API_PUBLIC_URL>/api/v1/payments/webhooks/finik`. Нужен публичный домен с HTTPS; `localhost` не подойдёт.

## Проверка в beta-среде

1. `PAYMENT_PROVIDER=finik`, `FINIK_ENV=beta`, ключи beta.
2. Оформить онлайн-заказ (`POST /api/v1/orders`) и открыть `payment.paymentUrl`.
3. Оплатить тестовым способом Finik.
4. Убедиться в логах API, что вебхук принят (`outcome: processed`), а заказ стал `PAID`.
5. Если вебхук отклонён с `Invalid webhook signature` — сверить пункты 3–4 из раздела «Важно перед запуском».

После успешной проверки — ключи prod и `FINIK_ENV=prod`.
