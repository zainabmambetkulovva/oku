import { type APIRequestContext, expect, type Page, test } from '@playwright/test';
import path from 'node:path';

/** Этап 9: заказы, пользователи, отзывы, аудиокниги с главами, подписчики, журнал. */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD };

async function adminSignIn(page: Page, next: string) {
  await page.goto(`/ru/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(ADMIN.email!);
  await page.getByLabel('Пароль', { exact: true }).fill(ADMIN.password!);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, '\\/')}$`));
}

async function customer(request: APIRequestContext, tag: string) {
  const email = `e2e-ops-${tag}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.kg`;
  const response = await request.post(`${API}/auth/register`, {
    data: { email, password: 'Secret123', firstName: 'Клиент' },
  });
  const token = (await response.json()).data.accessToken as string;
  return { email, headers: { Authorization: `Bearer ${token}` } };
}

test.describe('admin operations', () => {
  test.skip(!ADMIN.email || !ADMIN.password, 'SEED_ADMIN_* are not set');

  test('confirms and completes a cash order, then sees it on the customer card', async ({
    page,
    request,
  }, info) => {
    const buyer = await customer(request, `order-${info.project.name}`);
    const book = (await (await request.get(`${API}/books/duinodogu-en-maaniluu-okuuchu`)).json())
      .data;
    await request.post(`${API}/cart/items`, { headers: buyer.headers, data: { bookId: book.id } });
    const created = await request.post(`${API}/orders`, {
      headers: buyer.headers,
      data: {
        recipientName: 'Клиент',
        recipientPhone: '+996700111222',
        deliveryMethod: 'PICKUP',
        paymentMethod: 'CASH',
      },
    });
    const orderNumber = (await created.json()).data.order.orderNumber as string;

    await adminSignIn(page, '/ru/admin/orders');
    await page.getByLabel('Номер, e-mail, телефон или имя').fill(orderNumber);
    await expect(page.getByTestId('admin-orders').getByRole('link')).toHaveCount(1);
    await page.getByTestId('admin-orders').getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/ru/admin/orders/${orderNumber}$`));

    const actions = page.getByTestId('order-actions');
    await actions.getByRole('button', { name: 'Подтвердить / в обработку' }).click();
    await expect(page.getByRole('status')).toHaveText('Статус обновлён');
    await expect(
      page.getByRole('banner').or(page.locator('main')).getByTestId('admin-order-status').first(),
    ).toHaveText('Собирается');
    // «Отправлен» только для курьера и почты — для самовывоза кнопки нет
    await expect(actions.getByRole('button', { name: 'Отправлен' })).toHaveCount(0);
    await actions.getByRole('button', { name: 'Выполнен' }).click();
    await expect(page.locator('main').getByTestId('admin-order-status').first()).toHaveText(
      'Завершён',
    );

    await page.getByRole('link', { name: buyer.email }).click();
    await expect(page.getByTestId('user-stats')).toContainText('Оплаченных заказов: 1');
  });

  test('blocks and unblocks a customer', async ({ page, request }, info) => {
    const buyer = await customer(request, `ban-${info.project.name}`);
    await adminSignIn(page, '/ru/admin/users');
    await page.getByLabel('E-mail, имя или телефон').fill(buyer.email);
    const row = page.getByTestId('admin-users').getByRole('link');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(buyer.email);
    await row.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(buyer.email);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('user-actions').getByRole('button', { name: 'Заблокировать' }).click();
    await expect(page.getByText('Статус изменён')).toBeVisible();
    // Заблокированный не может войти
    const login = await request.post(`${API}/auth/login`, {
      data: { email: buyer.email, password: 'Secret123' },
    });
    expect(login.status()).toBe(403);
    await page.getByTestId('user-actions').getByRole('button', { name: 'Разблокировать' }).click();
    await expect(page.getByTestId('user-actions')).toContainText('Активен');
  });

  test('hides a reported review', async ({ page, request }, info) => {
    const author = await customer(request, `rev-${info.project.name}`);
    const reader = await customer(request, `rep-${info.project.name}`);
    const text = `Плохой отзыв ${info.project.name} ${Date.now()}`;
    const review = (
      await (
        await request.post(`${API}/books/jamila/reviews`, {
          headers: author.headers,
          data: { rating: 1, text },
        })
      ).json()
    ).data;
    await request.post(`${API}/reviews/${review.id}/report`, {
      headers: reader.headers,
      data: { reason: 'Оскорбления' },
    });

    await adminSignIn(page, '/ru/admin/reviews');
    await page.getByLabel('Только с жалобами').check();
    const card = page.getByTestId('admin-review').filter({ hasText: text });
    await expect(card).toContainText('Жалоб: 1');
    await expect(card).toContainText('Оскорбления');
    await card.getByRole('button', { name: 'Скрыть' }).click();
    // После скрытия появляется «Показать снова» — значит, сервер сохранил решение
    await expect(card.getByRole('button', { name: 'Показать снова' })).toBeVisible();
    const visible = await (await request.get(`${API}/books/jamila/reviews?limit=50`)).json();
    expect(visible.data.map((item: { text: string }) => item.text)).not.toContain(text);
  });

  test('creates an audiobook with an uploaded chapter, publishes it and grants access', async ({
    page,
    request,
  }, info) => {
    const listener = await customer(request, `aud-${info.project.name}`);
    const title = `Аудиокитеп e2e ${info.project.name} ${Date.now()}`;
    await adminSignIn(page, '/ru/admin/audiobooks/new');
    const form = page.getByTestId('audiobook-form');
    await form.getByLabel('Название').fill(title);
    await form.getByLabel('Автор').fill('Автор e2e');
    await form.getByLabel('Цена, сом').fill('300');
    await form.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByText('Аудиокнига создана')).toBeVisible();

    // Без глав опубликовать нельзя
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(
      page.getByText('Глав пока нет. Без глав опубликовать аудиокнигу нельзя.').first(),
    ).toBeVisible();

    const chapters = page.getByTestId('chapters');
    await chapters
      .getByLabel('Аудиофайл')
      .setInputFiles(path.join(__dirname, 'fixtures/chapter.mp3'));
    await chapters.getByLabel('Название главы').fill('1-бөлүм');
    await chapters.getByRole('checkbox', { name: 'Бесплатно' }).last().check();
    await chapters.getByRole('button', { name: 'Загрузить главу' }).click();
    await expect(chapters.getByTestId('chapter')).toHaveCount(1, { timeout: 20_000 });
    await expect(chapters.getByTestId('chapter')).toContainText('0:03');

    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(page.getByText('В продаже').first()).toBeVisible();

    const access = page.getByTestId('access');
    await access.getByLabel('E-mail покупателя').fill(listener.email);
    await access.getByRole('button', { name: 'Выдать доступ' }).click();
    await expect(access.getByTestId('grant')).toContainText(listener.email);
    await expect(access.getByTestId('grant')).toContainText('вручную');

    const slug = (
      await (await request.get(`${API}/audiobooks?search=${encodeURIComponent(title)}`)).json()
    ).data[0].slug;
    const info2 = await (
      await request.get(`${API}/audiobooks/${slug}/access`, { headers: listener.headers })
    ).json();
    expect(info2.data.hasFullAccess).toBe(true);
  });

  test('lists and exports newsletter subscribers; journal records actions', async ({
    page,
    request,
  }, info) => {
    const email = `e2e-sub-${info.project.name}-${Date.now()}@example.kg`;
    await request.post(`${API}/newsletter/subscribe`, { data: { email } });
    await adminSignIn(page, '/ru/admin/newsletter');
    await page.getByLabel('Поиск по e-mail').fill(email);
    await expect(page.getByTestId('subscribers')).toContainText(email);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Скачать CSV (активные)' }).click();
    expect((await download).suggestedFilename()).toBe('oku24-subscribers.csv');

    await page.goto('/ru/admin/audit');
    await expect(page.getByTestId('audit-log').getByRole('listitem').first()).toBeVisible();
    await page.goto('/ru/admin/payments');
    await expect(page.getByRole('heading', { level: 1, name: 'Платежи' })).toBeVisible();
  });
});
