import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

/** Этап 7: личный кабинет и аудиотека. Нужен API с seed-данными и тестовым провайдером оплаты. */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

async function account(request: APIRequestContext, tag: string) {
  const email = `e2e-acc-${tag}-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.kg`;
  const password = 'Secret123';
  const response = await request.post(`${API}/auth/register`, {
    data: { email, password, firstName: 'Нурлан' },
  });
  expect(response.ok()).toBeTruthy();
  return { email, password };
}

async function signIn(page: Page, user: { email: string; password: string }, next = '/ru/account') {
  await page.goto(`/ru/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(user.email);
  await page.getByLabel('Пароль', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, '\\/')}$`));
}

const nav = (page: Page) => page.getByTestId('account-nav');

test.describe('account', () => {
  test('asks guests to sign in', async ({ page }) => {
    await page.goto('/ky/account/orders');
    await expect(page.getByText('Жеке кабинетти ачуу үчүн кириңиз.')).toBeVisible();
  });

  test('overview, profile, language and password', async ({ page, request }, info) => {
    const user = await account(request, `profile-${info.project.name}`);
    await signIn(page, user);
    await expect(page.getByTestId('account-hello')).toHaveText('Здравствуйте, Нурлан!');
    await expect(page.getByText(`Почта ${user.email} не подтверждена`)).toBeVisible();
    await expect(page.getByTestId('orders-empty')).toBeVisible();
    await expect(page.getByTestId('library-empty')).toBeVisible();

    await nav(page).getByRole('link', { name: 'Профиль' }).click();
    const form = page.getByTestId('profile-form');
    await form.getByLabel('Имя').fill('Нурлан');
    await form.getByLabel('Фамилия').fill('Асанов');
    await form.getByLabel('Телефон').fill('12');
    await form.getByRole('button', { name: 'Сохранить' }).click();
    await expect(form.getByText('Укажите телефон в формате')).toBeVisible();
    await form.getByLabel('Телефон').fill('+996 700 555 777');
    await form.getByLabel('Язык писем и уведомлений').selectOption('ky');
    await form.getByRole('button', { name: 'Сохранить' }).click();
    await expect(form.getByText('Профиль сохранён')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('profile-form').getByLabel('Телефон')).toHaveValue(
      '+996 700 555 777',
    );
    await expect(
      page.getByTestId('profile-form').getByLabel('Язык писем и уведомлений'),
    ).toHaveValue('ky');

    const password = page.getByTestId('password-form');
    await password.getByLabel('Текущий пароль', { exact: true }).fill('Wrong12345');
    await password.getByLabel('Новый пароль', { exact: true }).fill('NewSecret456');
    await password.getByRole('button', { name: 'Сменить пароль' }).click();
    await expect(password.getByText('Текущий пароль неверный')).toBeVisible();
    await password.getByLabel('Текущий пароль', { exact: true }).fill(user.password);
    await password.getByRole('button', { name: 'Сменить пароль' }).click();
    await expect(password.getByText('Пароль изменён')).toBeVisible();

    const login = await request.post(`${API}/auth/login`, {
      data: { email: user.email, password: 'NewSecret456' },
    });
    expect(login.ok()).toBeTruthy();
  });

  test('address book is used at checkout', async ({ page, request }, info) => {
    const user = await account(request, `addr-${info.project.name}`);
    await signIn(page, user, '/ru/account/addresses');
    await page.getByRole('button', { name: 'Добавить адрес' }).click();
    const form = page.getByTestId('address-form');
    await form.getByLabel('Название (например, «Дом»)').fill('Дом');
    await form.getByLabel('Получатель').fill('Нурлан Асанов');
    await form.getByLabel('Телефон').fill('+996 700 111 222');
    await form.getByLabel('Город / село').fill('Бишкек');
    await form.getByLabel('Улица').fill('Токтогула');
    await form.getByLabel('Дом', { exact: true }).fill('10');
    await form.getByRole('button', { name: 'Сохранить адрес' }).click();
    await expect(page.getByTestId('address')).toHaveCount(1);
    await expect(page.getByTestId('address')).toContainText('Основной');

    await page.getByRole('button', { name: 'Добавить адрес' }).click();
    await form.getByLabel('Название (например, «Дом»)').fill('Работа');
    await form.getByLabel('Получатель').fill('Нурлан Асанов');
    await form.getByLabel('Телефон').fill('+996 700 111 222');
    await form.getByLabel('Город / село').fill('Бишкек');
    await form.getByLabel('Улица').fill('Манаса');
    await form.getByLabel('Дом', { exact: true }).fill('40');
    await form.getByRole('button', { name: 'Сохранить адрес' }).click();
    await expect(page.getByTestId('address')).toHaveCount(2);
    const work = page.getByTestId('address').filter({ hasText: 'Работа' });
    await work.getByRole('button', { name: 'Сделать основным' }).click();
    await expect(work).toContainText('Основной');

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByTestId('address')
      .filter({ hasText: 'Дом' })
      .getByRole('button', { name: 'Удалить' })
      .click();
    await expect(page.getByTestId('address')).toHaveCount(1);

    // При оформлении сохранённый адрес предлагается сразу
    await page.goto('/ru/books/jamila');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }).click();
    await page.goto('/ru/checkout');
    await page
      .getByTestId('checkout-form')
      .getByRole('radio', { name: /Курьер по Бишкеку/ })
      .check();
    await expect(page.getByTestId('address').getByRole('radio', { name: /Работа/ })).toBeChecked();
  });

  test('a bought audiobook plays in full and resumes where it stopped', async ({
    page,
    request,
  }, info) => {
    const user = await account(request, `audio-${info.project.name}`);
    await page.goto('/ru/audiobooks/jamila-audio');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }).click();
    await signIn(page, user, '/ru/checkout');
    await page.getByTestId('checkout-form').getByLabel('Телефон').fill('+996 700 000 999');
    await page.getByRole('button', { name: 'Перейти к оплате' }).click();
    await page.getByRole('button', { name: 'Тест: оплата прошла' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Выполнен', { timeout: 15_000 });

    // Кабинет: заказ, аудиокнига, уведомления
    await page.goto('/ru/account/orders');
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(page.getByTestId('order-row')).toContainText('Выполнен');
    await nav(page)
      .getByRole('link', { name: /Уведомления/ })
      .click();
    await expect(page.getByTestId('notification').first()).toContainText('Заказ выполнен');
    await expect(nav(page).getByTestId('unread-count')).toHaveText('2');
    await page.getByRole('button', { name: 'Отметить все прочитанными' }).click();
    await expect(nav(page).getByTestId('unread-count')).toHaveCount(0);

    await nav(page).getByRole('link', { name: 'Мои аудиокниги' }).click();
    await expect(page.getByTestId('library-item')).toContainText('Джамиля');
    await expect(page.getByTestId('library-progress')).toHaveText('Ещё не начинали');
    await page.getByTestId('library-item').getByRole('link', { name: 'Слушать' }).click();

    // Платная глава теперь доступна
    const player = page.getByTestId('audio-player');
    await expect(player.getByTestId('full-access')).toBeVisible();
    await player.getByRole('listitem').nth(1).getByRole('button').click();
    await expect(player.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Пауза', {
      timeout: 15_000,
    });
    await page.waitForTimeout(3000);
    await player.getByTestId('player-toggle').click();
    await expect(player.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Слушать');

    // Место сохранено в аккаунте: после перезагрузки можно продолжить
    await expect
      .poll(async () => {
        await page.reload();
        return page
          .getByTestId('player-resume')
          .textContent({ timeout: 5000 })
          .catch(() => null);
      })
      .toMatch(/Продолжить: глава 2, 0:0[1-9]/);
    await page.getByTestId('player-resume').click();
    await expect(player.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Пауза', {
      timeout: 15_000,
    });

    await page.goto('/ru/account/audiobooks');
    await expect(page.getByTestId('library-progress')).toContainText('Прослушано');
    await expect(page.getByTestId('listening-history')).toContainText('Джамиля');
  });
});
