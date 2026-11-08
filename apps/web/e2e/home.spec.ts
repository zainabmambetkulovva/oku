import { expect, test } from '@playwright/test';

/**
 * Сквозные проверки главной: нужны API с seed-данными и запущенный web.
 * Проверяют реальные данные, языки, корзину, подписку и плеер.
 */

test.describe('home page', () => {
  test('redirects to a language and renders sections with catalog data', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(ky|ru)$/);

    await page.goto('/ru');
    await expect(page).toHaveTitle(/OKU24/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Открой мир, который скрывается между страницами',
    );
    await expect(
      page.getByRole('heading', { name: 'Книги, которые выбирают читатели' }),
    ).toBeVisible();
    // Категории из базы с иллюстрациями и отдельная карточка аудиокниг
    await expect(page.getByRole('link', { name: 'Открыть категорию: Психология' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Открыть категорию: Аудиокниги' })).toBeVisible();
    // Цена из тыйынов показана в сомах
    await expect(page.getByText('750 сом').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test('loads every illustration from the mockup', async ({ page }) => {
    await page.goto('/ru');
    // Прокрутить до конца, чтобы загрузились отложенные картинки
    for (let y = 0; y < 8000; y += 600) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(80);
    }
    await page.waitForLoadState('networkidle');
    const images = await page.evaluate(() =>
      [...document.images]
        // Скрытые на этом экране картинки браузер не загружает
        .filter((image) => image.getClientRects().length > 0)
        .map((image) => ({
          src: image.getAttribute('src'),
          loaded: image.complete && image.naturalWidth > 0,
        })),
    );
    expect(images.length).toBeGreaterThanOrEqual(7);
    expect(images.filter((image) => !image.loaded)).toEqual([]);
  });

  test('switches between Kyrgyz and Russian only', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.getByRole('link', { name: 'EN' })).toHaveCount(0);
    await page.getByRole('link', { name: 'KG' }).first().click();
    await expect(page).toHaveURL(/\/ky$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Барактардын арасында жашырынган дүйнөнү ач',
    );
    await expect(page.getByText('750 сом').first()).toBeVisible();

    await page.getByRole('link', { name: 'RU' }).first().click();
    await expect(page).toHaveURL(/\/ru$/);

    // Английской версии больше нет
    const response = await page.goto('/en');
    expect(response?.status()).toBe(404);
  });

  test('shows the latest reviews or an invitation to leave one', async ({ page }) => {
    await page.goto('/ru');
    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Отзывы наших читателей' }),
    });
    await expect(section.getByRole('link', { name: 'Оставить отзыв' })).toBeVisible();
    await expect(
      section.getByRole('figure').or(section.getByText('Отзывов пока нет')).first(),
    ).toBeVisible();
  });

  test('adds books to the guest cart and keeps it after reload', async ({ page }) => {
    await page.goto('/ru');
    const badge = page.getByTestId('header-cart').getByTestId('count-badge');
    await expect(badge).toHaveCount(0);

    const firstCard = page
      .locator('#popular-title')
      .locator('xpath=ancestor::section')
      .getByRole('article')
      .first();
    await firstCard.getByRole('button', { name: 'В корзину' }).click();
    await expect(firstCard.getByRole('button', { name: 'В корзине' })).toBeVisible();
    await expect(badge).toHaveText('1');

    await page.reload();
    await expect(page.getByTestId('header-cart').getByTestId('count-badge')).toHaveText('1');
  });

  test('marks favorites', async ({ page }) => {
    await page.goto('/ru');
    const heart = page.getByRole('button', { name: 'В избранное' }).first();
    await heart.click();
    await expect(page.getByRole('button', { name: 'Убрать из избранного' }).first()).toBeVisible();
  });

  test('subscribes to the newsletter', async ({ page }) => {
    await page.goto('/ru');
    await page.getByLabel('Ваш e-mail').fill('not-an-email');
    await page.getByRole('button', { name: 'Подписаться' }).click();
    await expect(page.getByText('Введите корректный e-mail')).toBeVisible();

    await page.getByLabel('Ваш e-mail').fill(`e2e-${Date.now()}@example.kg`);
    await page.getByRole('button', { name: 'Подписаться' }).click();
    await expect(page.getByTestId('newsletter-success')).toBeVisible();
  });

  test('plays the free chapter and asks guests to sign in for paid ones', async ({ page }) => {
    await page.goto('/ru');
    const player = page.getByTestId('audio-player');
    await player.scrollIntoViewIfNeeded();

    await player.getByTestId('player-toggle').click();
    await expect(player.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Пауза', {
      timeout: 15_000,
    });
    const src = await player.locator('audio').getAttribute('src');
    expect(src).toContain('X-Amz-Signature=');

    // Первая платная глава (без отметки «Бесплатно»)
    await player
      .getByRole('listitem')
      .filter({ hasNotText: 'Бесплатно' })
      .first()
      .getByRole('button')
      .click();
    await expect(player.getByRole('status')).toHaveText('Войдите, чтобы слушать эту главу');
  });

  test('shows a localized 404 page', async ({ page }) => {
    const response = await page.goto('/ky/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Барак табылган жок');
  });
});

test('mobile menu opens and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/ru');
  await page.getByRole('button', { name: 'Меню' }).click();
  const dialog = page.getByRole('dialog', { name: 'Меню' });
  await expect(dialog.getByRole('link', { name: 'Аудиокниги' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
