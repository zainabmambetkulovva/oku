import { expect, test } from '@playwright/test';

/** Этап 3: каталог, фильтры, страницы книги и аудиокниги. Нужен API с seed-данными. */
test.describe('catalog', () => {
  for (const slug of ['psychology', 'self-development', 'islamic-literature', 'kids']) {
    test(`category page ${slug} lists only its books`, async ({ page, request }) => {
      const response = await page.goto(`/ru/books?category=${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
      const cards = page.getByTestId('catalog-grid').getByRole('article');
      await expect(cards.first()).toBeVisible();
      const api = await request.get(`http://localhost:3000/api/v1/books?category=${slug}&limit=50`);
      const { meta } = await api.json();
      await expect(cards).toHaveCount(Math.min(meta.total, 12));
    });
  }

  test('audiobooks catalog shows audiobooks', async ({ page }) => {
    await page.goto('/ky/audiobooks');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('catalog-grid').getByRole('article').first()).toBeVisible();
  });

  test('search, filters, sort and empty state', async ({ page }) => {
    await page.goto('/ru/books');
    await page.locator('form[data-ready]').waitFor();
    await page.getByRole('searchbox').fill('Джамиля');
    await page.getByRole('searchbox').press('Enter');
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByTestId('catalog-grid').getByRole('article')).toHaveCount(1);

    await page.goto('/ru/books?inStock=true&category=kids');
    const titles = await page.getByTestId('catalog-grid').getByRole('heading').allTextContents();
    expect(titles.join(' ')).not.toContain('Алты тамгалуу');

    await page.goto('/ru/books?sort=price_asc&language=ky');
    const prices = (
      await page.getByTestId('catalog-grid').getByTestId('price').allTextContents()
    ).map((text) => Number(text.replace(/\D/g, '')));
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    await page.goto('/ru/books?minPrice=10000');
    await expect(page.getByTestId('catalog-empty')).toBeVisible();
  });

  test('paginates', async ({ page }) => {
    await page.goto('/ru/books?limit=4');
    await page.locator('form[data-ready]').waitFor();
    await expect(page.getByTestId('catalog-grid').getByRole('article')).toHaveCount(4);
    await page
      .getByRole('link', { name: /Вперёд/ })
      .first()
      .click();
    await expect(page).toHaveURL(/page=2/, { timeout: 15_000 });
    await expect(page.getByTestId('catalog-grid').getByRole('article')).toHaveCount(4);
  });
});

test.describe('product pages', () => {
  test('opens a book from a card and buys within stock', async ({ page }) => {
    await page.goto('/ru/books?search=Айтпагын');
    await page
      .getByTestId('catalog-grid')
      .getByRole('article')
      .first()
      .getByRole('link')
      .first()
      .click();
    await expect(page).toHaveURL(/\/books\/aitpagyn-bilishsin/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('book-3d')).toBeVisible();
    await expect(page.getByTestId('specs')).toBeVisible();
    await expect(page.getByTestId('stock')).toContainText('2');

    const box = page.getByTestId('purchase-box');
    const increase = box.getByRole('button', { name: 'Увеличить' });
    await increase.click();
    await expect(page.getByTestId('quantity')).toContainText('2');
    await expect(increase).toBeDisabled();

    await box.getByRole('button', { name: 'В корзину' }).click();
    await expect(page.getByTestId('toast')).toContainText('в корзине');
    await expect(page.getByTestId('header-cart').getByTestId('count-badge')).toHaveText('2');
    // Весь остаток уже в корзине — больше добавить нельзя
    await expect(box.getByRole('button', { name: 'Уже в корзине' })).toBeDisabled();
  });

  test('out-of-stock book cannot be bought', async ({ page }) => {
    await page.goto('/ru/books/alty-tamgaluu-tatuu');
    await expect(page.getByTestId('stock')).toHaveText('Нет в наличии');
    await expect(page.getByTestId('quantity')).toHaveCount(0);
    await expect(
      page.getByTestId('purchase-box').getByRole('button', { name: 'В корзину' }),
    ).toBeDisabled();
  });

  test('buy now goes to the cart', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    await page.getByTestId('purchase-box').getByRole('button', { name: 'Купить сейчас' }).click();
    await expect(page).toHaveURL(/\/ru\/cart/);
  });

  test('reviews invite guests to sign in and list similar books', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    const reviews = page.getByTestId('reviews');
    await reviews.scrollIntoViewIfNeeded();
    const signIn = reviews.getByRole('link', { name: 'Войдите, чтобы оставить отзыв' });
    await expect(signIn).toHaveAttribute('href', /\/login\?next=/);
    await expect(page.getByTestId('similar').getByRole('article').first()).toBeVisible();
  });

  test('audiobook page plays the free chapter and locks paid ones', async ({ page }) => {
    await page.goto('/ru/audiobooks/jamila-audio');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Джамиля');
    await expect(page.getByTestId('audio-meta')).toContainText('3 главы');
    const player = page.getByTestId('audio-player');
    await player.scrollIntoViewIfNeeded();
    await player.getByTestId('player-toggle').click();
    await expect(player.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Пауза', {
      timeout: 15_000,
    });
    await player
      .getByRole('listitem')
      .filter({ hasNotText: 'Бесплатно' })
      .first()
      .getByRole('button')
      .click();
    await expect(player.getByRole('status')).toHaveText('Войдите, чтобы слушать эту главу');
    await expect(
      page.getByTestId('purchase-box').getByRole('button', { name: 'Купить аудиокнигу' }),
    ).toBeVisible();
  });

  test('unknown product returns 404', async ({ page }) => {
    expect((await page.goto('/ru/books/no-such-book'))?.status()).toBe(404);
    expect((await page.goto('/ky/audiobooks/no-such-audio'))?.status()).toBe(404);
  });
});
