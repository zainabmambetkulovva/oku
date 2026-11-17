import { expect, test } from '@playwright/test';

test.describe('featured shelf', () => {
  test('shows the store covers and switches between them', async ({ page }) => {
    await page.goto('/ru');
    const shelf = page.getByTestId('featured-shelf');
    await shelf.scrollIntoViewIfNeeded();
    await expect(shelf.getByRole('heading', { level: 2 })).toHaveText('Новые поступления');
    await expect(shelf.getByTestId('featured-cover')).toHaveCount(5);

    const title = shelf.getByTestId('featured-title');
    // Кнопок нет: книга выбирается нажатием на обложку (и свайпом/стрелками)
    await shelf.getByRole('button', { name: 'Показать «Билимпоз»' }).click();
    await expect(title).toHaveText('Билимпоз');
    await shelf.getByRole('button', { name: 'Показать «Адептуулук алиппеси»' }).click();
    await expect(title).toHaveText('Адептуулук алиппеси');
    await expect(shelf.getByRole('button', { name: /Пауза|Назад|Вперёд/ })).toHaveCount(0);
  });

  test('links only to products that exist in the catalog', async ({ page }) => {
    await page.goto('/ky');
    const shelf = page.getByTestId('featured-shelf');
    await shelf.scrollIntoViewIfNeeded();
    // Ссылки ведут только на реальные страницы товаров
    for (const link of await shelf.getByTestId('featured-book-link').all()) {
      await expect(link).toHaveAttribute('href', /^\/ky\/books\/[\w-]+$/);
    }
    for (const link of await shelf.getByTestId('featured-audio-link').all()) {
      await expect(link).toHaveAttribute('href', /^\/ky\/audiobooks\/[\w-]+$/);
    }
  });
});
