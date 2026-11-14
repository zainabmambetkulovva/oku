import { expect, test, type Page } from '@playwright/test';

/**
 * Админ-панель: вход, права доступа, категория и книга с загрузкой картинок,
 * публикация и появление книги на главной.
 * Учётные записи создаёт seed из SEED_ADMIN_* / SEED_USER_* (в CI — заданы).
 */
const admin = { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD };
const user = { email: process.env.SEED_USER_EMAIL, password: process.env.SEED_USER_PASSWORD };

// Крошечная PNG-картинка для загрузки
const PNG = {
  name: 'cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}

test.describe('admin panel', () => {
  test.skip(!admin.email || !admin.password, 'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set');

  test('sends guests to the login page and back after signing in', async ({ page }) => {
    await page.goto('/ru/admin/books');
    await expect(page).toHaveURL(/\/ru\/login\?next=%2Fadmin%2Fbooks$/);
    await signIn(page, admin.email!, 'wrong-password-1');
    await expect(page.getByText('Неверный e-mail или пароль')).toBeVisible();
    await signIn(page, admin.email!, admin.password!);
    await expect(page).toHaveURL(/\/ru\/admin\/books$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Книги' })).toBeVisible();
  });

  test('does not let regular users in', async ({ page }) => {
    test.skip(!user.email || !user.password, 'SEED_USER_* are not set');
    await page.goto('/ru/login?next=/admin');
    await signIn(page, user.email!, user.password!);
    await expect(page.getByText('нет доступа к админ-панели')).toBeVisible();
  });

  test('creates a category and a book with images and publishes it', async ({ page, isMobile }) => {
    const stamp = `${Date.now()}${isMobile ? 'm' : 'd'}`;
    const categoryName = `E2E категория ${stamp}`;
    const title = `E2E книга ${stamp}`;

    await page.goto('/ru/login?next=/admin/categories');
    await signIn(page, admin.email!, admin.password!);
    await expect(page.getByRole('heading', { level: 1, name: 'Категории' })).toBeVisible();

    // Категория с картинкой
    await page.getByRole('button', { name: '+ Добавить категорию' }).click();
    await page.getByLabel('Картинка (для главной)').setInputFiles(PNG);
    await expect(page.getByRole('button', { name: 'Убрать' })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Название').fill(categoryName);
    // В конец списка — чтобы не вытеснять демо-категории на главной
    await page.getByLabel('Порядок').fill('900');
    await page.getByRole('button', { name: 'Сохранить' }).click();
    const card = page.getByRole('listitem').filter({ hasText: categoryName });
    await expect(card.locator('img')).toHaveAttribute('src', /categories\//);

    // Книга: черновик с обложкой и категорией
    await page.goto('/ru/admin/books/new');
    await page.getByLabel('Обложка').setInputFiles(PNG);
    await expect(page.getByRole('button', { name: 'Убрать' })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Название').fill(title);
    await page.getByLabel('Автор').fill('Автор E2E');
    await page.getByLabel('Цена, сом').fill('480');
    await page.getByLabel('Количество на складе').fill('5');
    await page.getByText(categoryName).click();
    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/ru\/admin\/books\/[0-9a-f-]{36}\?created=1$/);
    await expect(page.getByText('Книга создана как черновик')).toBeVisible();
    await expect(page.getByText('Черновик', { exact: true })).toBeVisible();

    // Дополнительное фото
    await page.getByLabel('Добавить фото').setInputFiles(PNG);
    await expect(page.locator('img[src*="books/images/"]')).toHaveCount(1, { timeout: 15_000 });

    // Публикация — книга появляется на главной с обложкой
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(page.getByText('Книга опубликована и видна на сайте')).toBeVisible();

    await page.goto('/ru');
    const bookCard = page.getByRole('article').filter({ hasText: title }).first();
    await expect(bookCard).toBeVisible();
    await expect(bookCard.locator('img')).toHaveAttribute('src', /books\/covers\//);
    await expect(bookCard.getByText('480 сом')).toBeVisible();

    // В списке админки — с поиском
    await page.goto('/ru/admin/books');
    await page.getByLabel('Название, автор или ISBN').fill(stamp);
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  });
});
