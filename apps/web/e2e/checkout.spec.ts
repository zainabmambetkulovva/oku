import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

/**
 * Этап 6: оформление заказа и оплата. Онлайн-оплата проверяется тестовым провайдером
 * API (только разработка/CI): заказ становится оплаченным, только когда API обработал
 * событие платежа — сайт сам статус не меняет.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

async function signedInWithCart(
  page: Page,
  request: APIRequestContext,
  slugs: string[],
  tag: string,
) {
  const email = `e2e-order-${tag}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.kg`;
  const password = 'Secret123';
  expect(
    (
      await request.post(`${API}/auth/register`, {
        data: { email, password, firstName: 'Айгерим' },
      })
    ).ok(),
  ).toBeTruthy();
  for (const slug of slugs) {
    await page.goto(`/ru/${slug}`);
    await page
      .getByTestId('purchase-box')
      .getByRole('button', { name: /В корзину/ })
      .click();
  }
  await page.goto('/ru/login?next=%2Fru%2Fcart');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/cart$/);
  await expect(page.getByTestId('cart-line')).toHaveCount(slugs.length);
  await page.getByTestId('to-checkout').click();
  await expect(page.getByTestId('checkout-form')).toBeVisible();
}

const form = (page: Page) => page.getByTestId('checkout-form');

test.describe('checkout', () => {
  test('asks guests to sign in', async ({ page }) => {
    await page.goto('/ky/checkout');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Буйрутма берүү');
    await expect(page.getByRole('link', { name: 'Кирүү', exact: true }).last()).toHaveAttribute(
      'href',
      /\/ky\/login\?next=%2Fcheckout/,
    );
  });

  test('pickup with cash: order is accepted and awaits confirmation', async ({
    page,
    request,
  }, info) => {
    await signedInWithCart(
      page,
      request,
      ['books/duinodogu-en-maaniluu-okuuchu'],
      `cash-${info.project.name}`,
    );

    // Без телефона и способа получения заказ не уходит
    await form(page)
      .getByRole('button', { name: /Перейти к оплате/ })
      .click();
    await expect(form(page).getByText('Укажите телефон в формате +996 700 123 456')).toBeVisible();
    await expect(form(page).getByText('Обязательное поле')).toBeVisible();

    await form(page).getByLabel('Телефон').fill('+996 700 123 456');
    await form(page)
      .getByRole('radio', { name: /Самовывоз/ })
      .check();
    await expect(form(page).getByTestId('checkout-delivery')).toHaveText('бесплатно');
    await expect(form(page)).toContainText('Бишкек, проспект Чуй 394 · 10:00–19:30');
    await form(page)
      .getByRole('radio', { name: /Наличными при получении/ })
      .check();
    await expect(form(page).getByTestId('checkout-total')).toHaveText('650 сом');
    await form(page).getByRole('button', { name: 'Оформить заказ' }).click();

    await expect(page).toHaveURL(/\/ru\/orders\/OKU-/);
    await expect(page.getByTestId('order-status')).toHaveText('Принят, ждёт подтверждения');
    await expect(page.getByTestId('order-summary')).toContainText('Наличными при получении');
    await expect(page.getByTestId('order-summary')).toContainText('проспект Чуй 394');
    await expect(page.getByTestId('pay')).toHaveCount(0);
    await expect(page.getByTestId('header-cart').getByTestId('count-badge')).toHaveCount(0);
  });

  test('courier with online payment: paid only after the payment is confirmed', async ({
    page,
    request,
  }, info) => {
    await signedInWithCart(
      page,
      request,
      ['books/kun-batkanga-cheiin'],
      `paid-${info.project.name}`,
    );
    await form(page).getByLabel('Телефон').fill('+996 555 000 111');
    await form(page)
      .getByRole('radio', { name: /Курьер по Бишкеку/ })
      .check();
    await form(page).getByLabel('Город / село').fill('Бишкек');
    await form(page).getByLabel('Улица').fill('Киевская');
    await form(page).getByLabel('Дом').fill('95');
    await expect(form(page).getByTestId('checkout-total')).toHaveText('900 сом'); // 700 + 200
    await form(page).getByRole('button', { name: 'Перейти к оплате' }).click();

    // «Страница оплаты» тестового провайдера
    await expect(page).toHaveURL(/\/ru\/checkout\/test-payment\?paymentId=/);
    await expect(page.getByTestId('test-payment')).toContainText('900 сом');
    await page.getByRole('button', { name: 'Тест: оплата прошла' }).click();

    await expect(page).toHaveURL(/\/ru\/orders\/OKU-.+\?payment=/);
    await expect(page.getByTestId('order-status')).toHaveText('Оплачен', { timeout: 15_000 });
    await expect(page.getByTestId('order-status-text')).toContainText('подтверждена Finik');
    await expect(page.getByTestId('order-summary')).toContainText('Киевская');
    await expect(page.getByTestId('order-total')).toHaveText('900 сом');
  });

  test('failed payment can be retried or the order cancelled', async ({ page, request }, info) => {
    await signedInWithCart(
      page,
      request,
      ['books/shakhmat-novellasy'],
      `fail-${info.project.name}`,
    );
    await form(page).getByLabel('Телефон').fill('+996 555 000 222');
    await form(page)
      .getByRole('radio', { name: /Почта по Кыргызстану/ })
      .check();
    // Наличными по почте нельзя
    await expect(form(page).getByRole('radio', { name: /Наличными/ })).toBeDisabled();
    await form(page).getByLabel('Город / село').fill('Ош');
    await form(page).getByLabel('Улица').fill('Ленина');
    await form(page).getByLabel('Дом').fill('1');
    await form(page).getByRole('button', { name: 'Перейти к оплате' }).click();

    await page.getByRole('button', { name: 'Тест: оплата не прошла' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Ожидает оплаты');
    await expect(page.getByText('Платёж не прошёл')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pay')).toBeVisible();
    await expect(page.getByTestId('countdown')).toContainText('Осталось');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Отменить заказ' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Отменён');
    await expect(page.getByTestId('pay')).toHaveCount(0);
  });

  test('audiobooks only: no delivery, online only, available after payment', async ({
    page,
    request,
  }, info) => {
    await signedInWithCart(
      page,
      request,
      ['audiobooks/jamila-audio'],
      `audio-${info.project.name}`,
    );
    await expect(form(page).getByTestId('delivery-methods')).toHaveCount(0);
    await expect(form(page).getByRole('radio', { name: /Наличными/ })).toBeDisabled();
    await form(page).getByLabel('Телефон').fill('+996 555 000 333');
    await form(page).getByRole('button', { name: 'Перейти к оплате' }).click();
    await page.getByRole('button', { name: 'Тест: оплата прошла' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Выполнен', { timeout: 15_000 });
    await expect(page.getByTestId('order-status-text')).toContainText('аудиокниги доступны');
  });
});
