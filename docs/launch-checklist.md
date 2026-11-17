# Чек-лист запуска OKU24

Порядок действий перед открытием магазина на https://oku24.vercel.app (или своём домене).
Подробности по каждому сервису — в [deployment.md](deployment.md) и [payments-finik.md](payments-finik.md).
Ключи и пароли вводятся только в настройках Vercel / GitHub Secrets, никогда в коде или переписке.

## 1. Переменные Vercel (Project → Settings → Environment Variables, окружение Production)

| Переменная | Значение |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL`, `DIRECT_URL` | Строки подключения Neon (pooled и direct) |
| `JWT_SECRET` | Случайная строка от 32 символов |
| `INTERNAL_API_TOKEN` | Случайная строка от 32 символов (общая для api и web) |
| `FRONTEND_URL`, `CORS_ORIGINS`, `API_PUBLIC_URL` | Адрес сайта, например `https://oku24.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Тот же адрес — для canonical, sitemap.xml и robots.txt (без него берётся домен Vercel) |
| `COOKIE_SECURE` | `true` |
| `JOBS_ENABLED` | `false` |
| `ORDER_EXPIRY_ON_REQUEST` | `true` — неоплаченные заказы отменяются и товар возвращается на склад при обращениях к заказам (задача по расписанию в Vercel не работает) |
| `REDIS_URL` | Внешний Redis (кэш каталога и лимиты); без него кэш хранится в памяти функции |
| `S3_*`, `MEDIA_PUBLIC_BASE_URL` | Хранилище обложек и аудио (публичный и приватный бакеты) |
| `MAIL_TRANSPORT=brevo`, `BREVO_API_KEY`, `MAIL_FROM` | Письма (см. п. 4) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Вход через Google (см. п. 3) |
| `PAYMENT_PROVIDER=finik`, `FINIK_*` | Оплата (см. п. 5). `test` в production запрещён |
| `ROLE_MANAGER_EMAILS` | E-mail администраторов, которым разрешено менять роли |
| `SWAGGER_ENABLED` | Не задавать (в production документация API выключена) |
| `NEXT_PUBLIC_CONTACT_WHATSAPP`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_INSTAGRAM_URL` | Контакты в подвале |

После изменения переменных — **Redeploy** (переменные `NEXT_PUBLIC_*` встраиваются при сборке).

## 2. База данных

- [ ] GitHub → Actions → **Production database** → `migrate` (секреты `DATABASE_URL`, `DIRECT_URL` в GitHub Secrets).
- [ ] Затем `status` — все миграции применены, расхождений нет.
- [ ] `create-admin` — назначить первого администратора. Seed с тестовыми данными в production не запускать.
- [ ] Neon: включить ветку-бэкап / point-in-time restore (Settings → Storage, хранение истории не меньше 7 дней); перед каждой миграцией делать ветку-снимок.

## 3. Google (вход через Google)

- [ ] Google Cloud Console → OAuth consent screen: название OKU24, логотип, ссылки на `/ky/privacy` и `/ky/terms`, статус **In production**.
- [ ] Credentials → OAuth Client (Web): Authorized redirect URI `https://<домен>/api/v1/auth/google/callback`.
- [ ] Ключи — в переменные Vercel. Проверить вход новым и существующим аккаунтом.

## 4. Brevo (письма)

- [ ] Добавить домен отправителя, записи SPF, DKIM и DMARC в DNS; дождаться статуса Authenticated.
- [ ] `MAIL_FROM` — адрес на подтверждённом домене.
- [ ] Проверить письма KG и RU: подтверждение почты, сброс пароля, заказ создан, оплачен, отменён.

## 5. Finik (оплата)

- [ ] Beta: пройти тестовую оплату, отмену и просрочку; webhook приходит на `https://<домен>/api/v1/payments/webhooks/finik`.
- [ ] Production: получить боевые ключи, `FINIK_ENV=prod`, новые `FINIK_API_KEY`, `FINIK_ACCOUNT_ID`, ключи подписи.
- [ ] Первая реальная оплата на небольшую сумму, затем возврат через кабинет Finik.
- [ ] Заказ становится «Оплачен» только после подтверждённого webhook Finik.

## 6. Домен (если меняется адрес)

- [ ] Vercel → Domains: добавить домен, DNS-записи, HTTPS.
- [ ] Обновить `FRONTEND_URL`, `CORS_ORIGINS`, `API_PUBLIC_URL`, `NEXT_PUBLIC_SITE_URL`.
- [ ] Обновить redirect URI в Google и адрес webhook / возврата в Finik.
- [ ] Redeploy.

## 7. Поиск и мониторинг

- [ ] Google Search Console: подтвердить сайт, отправить `https://<домен>/sitemap.xml`.
- [ ] Проверить `https://<домен>/robots.txt` и карточку книги в Rich Results Test.
- [ ] Мониторинг доступности `https://<домен>/api/v1/health` (например, UptimeRobot, раз в 5 минут).
- [ ] Vercel → Logs / Observability: оповещения об ошибках 5xx.

## 8. Последняя проверка на production

- [ ] Каталог, поиск, фильтры, страницы книг и аудиокниг на KG и RU, на телефоне и компьютере.
- [ ] Регистрация, вход, сброс пароля, вход через Google.
- [ ] Корзина гостя переносится в аккаунт; избранное.
- [ ] Заказ: самовывоз (бесплатно), курьер (200 сом), почта (300 сом); наличные и Finik.
- [ ] Аудиокнига после оплаты открывается в «Моих аудиокнигах», плеер продолжает с места остановки.
- [ ] Админка: смена статуса заказа, модерация отзывов, загрузка обложки и главы.
- [ ] Удалить тестовые заказы и пользователей, созданные при проверке.
