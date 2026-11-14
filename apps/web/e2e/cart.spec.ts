import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

/** Этап 5: корзина и избранное — у гостя и в аккаунте. Нужен API с seed-данными. */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

async function newAccount(request: APIRequestContext, tag: string) {
  const email = `e2e-cart-${tag}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.kg`;
  const password = 'Secret123';
  const response = await request.post(`${API}/auth/register`, {
    data: { email, password, firstName: 'Тест' },
  });
  expect(response.ok()).toBeTruthy();
  return { email, password };
}

async function signIn(page: Page, account: { email: string; password: string }, next = '/ru/cart') {
  await page.goto(`/ru/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(account.email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}

const lines = (page: Page) => page.getByTestId('cart-line');

test.describe('guest cart', () => {
  test('shows recommendations when empty', async ({ page }) => {
    await page.goto('/ky/cart');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Себет');
    await expect(page.getByTestId('cart-empty')).toContainText('Себет азырынча бош');
    await expect(page.getByTestId('cart-empty').getByRole('article').first()).toBeVisible();
  });

  test('changes quantity within stock, removes and restores a line', async ({ page }) => {
    await page.goto('/ru/books/aitpagyn-bilishsin'); // на складе 2
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }).click();
    await page.goto('/ru/audiobooks/jamila-audio');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }).click();
    await page.goto('/ru/cart');

    await expect(lines(page)).toHaveCount(2);
    const book = lines(page).filter({ hasText: 'Айтпагын' });
    await book.getByRole('button', { name: 'Увеличить' }).click();
    await expect(book.getByTestId('line-quantity')).toHaveText('2');
    await expect(book.getByRole('button', { name: 'Увеличить' })).toBeDisabled();
    await expect(page.getByTestId('subtotal')).toHaveText('1 850 сом'); // 2×700 + 450
    await expect(page.getByTestId('cart-delivery')).toContainText('Самовывоз');
    await expect(page.getByTestId('cart-delivery')).toContainText('200 сом');
    await expect(page.getByTestId('cart-delivery')).toContainText('300 сом');
    await expect(page.getByRole('link', { name: 'Войти и оформить заказ' })).toBeVisible();

    await book.getByRole('button', { name: 'Удалить' }).click();
    await expect(lines(page)).toHaveCount(1);
    await page.getByTestId('toast').getByRole('button', { name: 'Вернуть' }).click();
    await expect(lines(page)).toHaveCount(2);
    await expect(
      lines(page).filter({ hasText: 'Айтпагын' }).getByTestId('line-quantity'),
    ).toHaveText('2');
  });

  test('re-checks prices and stock saved in the browser', async ({ page }) => {
    await page.goto('/ru');
    const { id } = await (
      await page.request.get(`${API}/books/aitpagyn-bilishsin`)
    )
      .json()
      .then((body) => body.data);
    // Старая цена и больше, чем есть на складе (2)
    await page.evaluate((bookId) => {
      localStorage.setItem(
        'oku24-cart',
        JSON.stringify({
          state: {
            mode: 'guest',
            items: [
              {
                type: 'BOOK',
                id: bookId,
                slug: 'aitpagyn-bilishsin',
                title: 'Айтпагын, билишсин',
                author: 'Шермин Яшар',
                coverUrl: null,
                price: 50_000,
                quantity: 5,
              },
            ],
          },
          version: 2,
        }),
      );
    }, id);
    await page.goto('/ru/cart');
    await expect(page.getByTestId('price-changed')).toHaveText('Цена изменилась: было 500 сом');
    await expect(page.getByTestId('line-issue')).toContainText('На складе осталось 2 шт.');
    await page.getByRole('button', { name: 'Оставить 2 шт.' }).click();
    await expect(page.getByTestId('line-quantity')).toHaveText('2');
    await expect(page.getByTestId('line-issue')).toHaveCount(0);
  });
});

test.describe('guest favorites', () => {
  test('moves a favorite to the cart and restores a removed one', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В избранное' }).click();
    await page.goto('/ru/audiobooks/shakhmat-novellasy-audio');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В избранное' }).click();

    await page.goto('/ru/favorites');
    const cards = page.getByTestId('favorite-card');
    await expect(cards).toHaveCount(2);
    await expect(page.getByText('Войдите, чтобы избранное было доступно')).toBeVisible();

    await cards
      .filter({ hasText: 'Джамиля' })
      .getByRole('button', { name: 'Переложить в корзину' })
      .click();
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId('header-cart').getByTestId('count-badge')).toHaveText('1');

    await cards.first().getByRole('button', { name: 'Убрать из избранного' }).click();
    await expect(page.getByTestId('favorites-empty')).toBeVisible();
    await page.getByTestId('toast').getByRole('button', { name: 'Вернуть' }).click();
    await expect(cards).toHaveCount(1);
  });
});

test.describe('account', () => {
  test('moves the guest cart and favorites into the account without duplicates', async ({
    page,
    browser,
    request,
  }, info) => {
    const account = await newAccount(request, info.project.name);

    await page.goto('/ru/books/jamila');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'Увеличить' }).click();
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }).click();
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В избранное' }).click();

    await signIn(page, account);
    await expect(lines(page)).toHaveCount(1);
    await expect(lines(page).getByTestId('line-quantity')).toHaveText('2');

    // Другое устройство: та же корзина и то же избранное
    const other = await browser.newContext();
    const second = await other.newPage();
    await signIn(second, account);
    await expect(lines(second)).toHaveCount(1);
    await expect(lines(second).getByTestId('line-quantity')).toHaveText('2');
    await second.goto('/ru/favorites');
    await expect(second.getByTestId('favorite-card')).toHaveCount(1);
    await expect(second.getByTestId('favorite-card')).toContainText('Джамиля');

    // Изменение на втором устройстве видно на первом после перезагрузки
    await second.goto('/ru/cart');
    await lines(second).getByRole('button', { name: 'Уменьшить' }).click();
    await expect(lines(second).getByTestId('line-quantity')).toHaveText('1');
    await expect
      .poll(async () => {
        await page.reload();
        return lines(page).getByTestId('line-quantity').textContent();
      })
      .toBe('1');
    await other.close();

    // После выхода чужая корзина в браузере не видна; после входа — снова на месте
    if (info.project.name === 'desktop') {
      await page.getByTestId('account-menu').click();
      await page.getByRole('menuitem', { name: 'Выйти' }).click();
    } else {
      await page.getByRole('button', { name: 'Меню' }).click();
      await page.getByRole('button', { name: /Выйти/ }).click();
    }
    await expect(page.getByTestId('cart-empty')).toBeVisible();
    await signIn(page, account);
    await expect(lines(page)).toHaveCount(1);
  });
});
