import { expect, test } from '@playwright/test';

/** Этап 4: регистрация, вход, Google, восстановление пароля. Нужен API с seed-данными. */
const READER = {
  email: process.env.SEED_USER_EMAIL ?? 'reader@e2e.oku24.kg',
  password: process.env.SEED_USER_PASSWORD ?? 'E2eReader123',
};

test.describe('registration', () => {
  test('creates an account, signs in and out', async ({ page }, info) => {
    const email = `e2e-reg-${Date.now()}-${info.project.name}@example.kg`;
    await page.goto('/ru/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Регистрация');
    await page.getByLabel('Имя').fill('Айгерим');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Пароль', { exact: true }).fill('Secret123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();

    await expect(page.getByTestId('register-done')).toContainText(email);
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(page).toHaveURL(/\/ru$/);

    if (info.project.name === 'desktop') {
      await page.getByTestId('account-menu').click();
      await expect(page.getByRole('menu')).toContainText('Здравствуйте, Айгерим!');
      await expect(page.getByRole('menu')).toContainText('Почта не подтверждена');
      await page.getByRole('menuitem', { name: 'Выйти' }).click();
      await expect(page.getByTestId('account-link')).toBeVisible();
    } else {
      await page.getByRole('button', { name: 'Меню' }).click();
      await page.getByRole('button', { name: /Выйти/ }).click();
      await page.getByRole('button', { name: 'Меню' }).click();
      await expect(page.getByRole('dialog').getByRole('link', { name: 'Кабинет' })).toBeVisible();
    }
  });

  test('validates the form and reports a taken e-mail', async ({ page }) => {
    await page.goto('/ky/register');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Катталуу');
    await page.getByLabel('E-mail', { exact: true }).fill(READER.email);
    await page.getByLabel('Сырсөз', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Аккаунт түзүү' }).click();
    await expect(page.getByText('Сырсөз: кеминде 8 белги, тамга жана сан')).toBeVisible();
    await expect(page.getByText('Шарттарга макулдук керек')).toBeVisible();

    await page.getByLabel('Сырсөз', { exact: true }).fill('Secret123');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Аккаунт түзүү' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Бул e-mail мурун катталган',
    );
  });
});

test.describe('login', () => {
  test('rejects a wrong password and shows/hides the password', async ({ page }) => {
    await page.goto('/ru/login');
    await page.getByLabel('E-mail', { exact: true }).fill(READER.email);
    const password = page.getByLabel('Пароль', { exact: true });
    await password.fill('Wrong12345');
    await page.getByRole('button', { name: 'Показать пароль' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Скрыть пароль' }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Неверный e-mail или пароль',
    );
  });

  test('signs in and returns to the page the reader came from', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    await page
      .getByTestId('reviews')
      .getByRole('link', { name: /Войдите/ })
      .click();
    await expect(page).toHaveURL(/\/ru\/login\?next=/);
    await page.getByLabel('E-mail', { exact: true }).fill(READER.email);
    await page.getByLabel('Пароль', { exact: true }).fill(READER.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/ru\/books\/jamila$/);
    // Вошедший читатель видит форму отзыва вместо ссылки на вход
    await expect(page.getByTestId('reviews').getByText('Написать отзыв')).toBeVisible();
  });

  test('never redirects to another site after signing in', async ({ page }) => {
    await page.goto('/ru/login?next=//evil.example');
    await page.getByLabel('E-mail', { exact: true }).fill(READER.email);
    await page.getByLabel('Пароль', { exact: true }).fill(READER.password);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/localhost:3001\/ru$/);
  });

  test('Google button goes through the API and reports when Google is not configured', async ({
    page,
  }) => {
    await page.goto('/ky/login?next=/ky/books');
    const google = page.getByTestId('google-sign-in');
    await expect(google).toHaveText('Google аркылуу кирүү');
    const href = await google.getAttribute('href');
    expect(href).toContain('/auth/google?locale=ky&next=%2Fky%2Fbooks');
    // Без ключей Google API честно возвращает на вход с сообщением (в CI ключей нет)
    test.skip(Boolean(process.env.GOOGLE_CONFIGURED), 'Google keys are configured');
    await google.click();
    await expect(page).toHaveURL(/\/ky\/login\?error=google_unavailable/);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Google аркылуу кирүү азырынча',
    );
  });
});

test.describe('password recovery and e-mail verification', () => {
  test('requests a reset link with the same answer for any address', async ({ page }) => {
    await page.goto('/ru/login');
    await page.getByRole('link', { name: 'Забыли пароль?' }).click();
    await expect(page).toHaveURL(/\/ru\/forgot-password/);
    await page.getByLabel('E-mail', { exact: true }).fill('nobody@example.kg');
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();
    await expect(page.getByRole('main').getByRole('status')).toContainText('nobody@example.kg');
  });

  test('explains invalid reset and verification links', async ({ page }) => {
    await page.goto('/ru/reset-password');
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Ссылка недействительна');

    await page.goto('/ky/reset-password?token=bad-token');
    await page.getByLabel('Жаңы сырсөз', { exact: true }).fill('NewSecret123');
    await page.getByLabel('Сырсөздү кайталаңыз', { exact: true }).fill('Different123');
    await page.getByRole('button', { name: 'Сырсөздү сактоо' }).click();
    await expect(page.getByText('Сырсөздөр дал келбейт')).toBeVisible();
    await page.getByLabel('Сырсөздү кайталаңыз', { exact: true }).fill('NewSecret123');
    await page.getByRole('button', { name: 'Сырсөздү сактоо' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Шилтеме жараксыз');

    await page.goto('/ru/verify-email?token=bad-token');
    await expect(page.getByTestId('verify-email').getByRole('alert')).toContainText(
      'Ссылка недействительна',
    );
  });
});
