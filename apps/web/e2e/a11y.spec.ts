import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * Этап 10: доступность (WCAG 2.1 AA, автоматическая часть). Серьёзные и критические
 * нарушения axe недопустимы. Анимации выключены (как у посетителей с «уменьшить движение»),
 * чтобы проверка не попадала на элементы посреди появления.
 */
test.use({ reducedMotion: 'reduce' });

const PAGES = [
  '/ru',
  '/ky',
  '/ru/books',
  '/ru/books/jamila',
  '/ru/audiobooks',
  '/ru/audiobooks/jamila-audio',
  '/ru/cart',
  '/ru/favorites',
  '/ru/community',
  '/ru/login',
  '/ky/register',
  '/ru/delivery',
  '/ru/contacts',
];

async function seriousViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );
}

test.describe('accessibility', () => {
  for (const url of PAGES) {
    test(`no serious violations on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test('no serious violations in the account', async ({ page }) => {
    await page.goto('/ru/login?next=%2Fru%2Faccount');
    await page
      .getByLabel('E-mail', { exact: true })
      .fill(process.env.SEED_USER_EMAIL ?? 'reader@e2e.oku24.kg');
    await page
      .getByLabel('Пароль', { exact: true })
      .fill(process.env.SEED_USER_PASSWORD ?? 'E2eReader123');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/ru\/account$/);
    for (const url of ['/ru/account', '/ru/account/profile', '/ru/account/addresses']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await seriousViolations(page), url).toEqual([]);
    }
  });

  test('keyboard users can skip the menu', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'keyboard');
    await page.goto('/ru/books');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Перейти к содержимому' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('main')).toBeFocused();
  });
});
