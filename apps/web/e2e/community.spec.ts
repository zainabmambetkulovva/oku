import { expect, type Page, test } from '@playwright/test';

/** Этап 8: сообщество — цитата дня, тест, свидание вслепую, аудиовитрина, жалобы на отзывы. */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? 'admin@e2e.oku24.kg',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'E2eAdmin123',
};
const QUOTE_AUTHOR = 'Автор цитаты e2e';

async function signIn(page: Page, email: string, password: string, next: string) {
  await page.goto(`/ru/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, '\\/')}$`));
}

test.describe('community', () => {
  test('header leads to the community page', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'desktop navigation');
    await page.goto('/ru');
    await page.getByRole('banner').getByRole('link', { name: 'Сообщество' }).click();
    await expect(page).toHaveURL(/\/ru\/community$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Сообщество OKU24');
  });

  test('administrators add quotes that appear as the quote of the day', async ({ page }, info) => {
    await signIn(page, ADMIN.email, ADMIN.password, '/ru/admin/quotes');
    await page.getByRole('button', { name: 'Добавить цитату' }).click();
    const form = page.getByTestId('quote-form');
    const text = `Китеп — акылдын азыгы (${info.project.name} ${Date.now()})`;
    await form.getByLabel('Текст цитаты').fill(text);
    await form.getByLabel('Автор').fill(QUOTE_AUTHOR);
    await form.getByLabel('Язык').selectOption('ky');
    await form.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByTestId('admin-quote').filter({ hasText: text })).toBeVisible();

    // Цитата на сегодня — одна из цитат; на русской странице без русских цитат — кыргызская
    for (const locale of ['ky', 'ru']) {
      await page.goto(`/${locale}/community`);
      await expect(page.getByTestId('quote-of-day')).toContainText(QUOTE_AUTHOR);
    }
    await page.goto('/ky');
    await expect(page.getByTestId('quote-of-day')).toContainText(QUOTE_AUTHOR);
  });

  test('the quiz suggests real books from the catalog', async ({ page }) => {
    await page.goto('/ru/community');
    const quiz = page.getByTestId('quiz');
    await quiz.getByRole('button', { name: 'Понять себя и других' }).click();
    await quiz.getByRole('button', { name: 'Читать бумажную книгу' }).click();
    await quiz.getByRole('button', { name: 'На кыргызском' }).click();
    await expect(quiz.getByText('Вот что мы нашли для вас')).toBeVisible();
    const results = quiz.getByTestId('quiz-result');
    await expect(results.first()).toBeVisible();
    await expect(results.first()).toHaveAttribute('href', /\/ru\/books\//);

    await quiz.getByRole('button', { name: 'Пройти заново' }).click();
    await quiz.getByRole('button', { name: 'Книгу для ребёнка' }).click();
    await quiz.getByRole('button', { name: 'Слушать аудиокнигу' }).click();
    await quiz.getByRole('button', { name: 'Неважно' }).click();
    await expect(quiz.getByTestId('quiz-result').first()).toHaveAttribute(
      'href',
      /\/ru\/audiobooks\//,
    );
  });

  test('blind date shows hints first and the book after unwrapping', async ({ page }) => {
    await page.goto('/ky/community');
    const date = page.getByTestId('blind-date');
    await expect(date.getByTestId('wrapped-book')).toBeVisible();
    await expect(date.getByTestId('blind-date-hints').getByRole('listitem').first()).toBeVisible();
    await expect(date.getByTestId('revealed-book')).toHaveCount(0);
    await date.getByRole('button', { name: 'Китепти ачуу' }).click();
    await expect(date.getByTestId('revealed-book')).toBeVisible();
    await expect(date.getByRole('link', { name: 'Китеп тууралуу толугураак' })).toHaveAttribute(
      'href',
      /\/ky\/books\//,
    );
    await date.getByRole('button', { name: 'Башка китеп' }).click();
    await expect(date.getByTestId('wrapped-book')).toBeVisible();
  });

  test('audiobook showcase switches between audiobooks', async ({ page }) => {
    await page.goto('/ru');
    const showcase = page.getByTestId('audiobook-showcase');
    await showcase.scrollIntoViewIfNeeded();
    const tabs = showcase.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(1);
    const second = await tabs.nth(1).getAttribute('aria-label');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(
      showcase.getByTestId('audio-player').getByRole('heading', { level: 3 }),
    ).toHaveText(second!);
  });

  test('readers can report a review; guests are asked to sign in', async ({
    page,
    request,
  }, info) => {
    // Отзыв одного читателя
    const author = await request.post(`${API}/auth/register`, {
      data: {
        email: `e2e-author-${info.project.name}-${Date.now()}@example.kg`,
        password: 'Secret123',
        firstName: 'Автор',
      },
    });
    const token = (await author.json()).data.accessToken as string;
    const text = `Отзыв для жалобы ${info.project.name} ${Date.now()}`;
    const created = await request.post(`${API}/books/shakhmat-novellasy/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { rating: 2, text },
    });
    expect(created.ok()).toBeTruthy();

    await page.goto('/ru/community');
    const card = page
      .getByTestId('community-reviews')
      .getByRole('listitem')
      .filter({ hasText: text });
    await card.getByRole('button', { name: 'Пожаловаться' }).click();
    await expect(card.getByRole('link', { name: 'Войдите, чтобы пожаловаться' })).toBeVisible();

    // Другой читатель жалуется
    const email = `e2e-report-${info.project.name}-${Date.now()}@example.kg`;
    expect(
      (await request.post(`${API}/auth/register`, { data: { email, password: 'Secret123' } })).ok(),
    ).toBeTruthy();
    await signIn(page, email, 'Secret123', '/ru/community');
    const review = page
      .getByTestId('community-reviews')
      .getByRole('listitem')
      .filter({ hasText: text });
    await review.getByRole('button', { name: 'Пожаловаться' }).click();
    await review.getByLabel('Что не так? (необязательно)').fill('Реклама');
    await review.getByRole('button', { name: 'Отправить' }).click();
    await expect(review.getByRole('status')).toHaveText('Спасибо! Модератор проверит отзыв.');
  });
});
