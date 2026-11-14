import { expect, test } from '@playwright/test';

/** Этап 2: шапка, поиск, подвал и информационные страницы на двух языках. */

test.describe('navigation and info pages', () => {
  test('hero shows the approved texts and both buttons lead to real places', async ({ page }) => {
    await page.goto('/ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Каждая книга — целая вселенная',
    );
    await expect(
      page.getByText('Открой мир, который скрывается между страницами').first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Исследовать книги' })).toHaveAttribute(
      'href',
      '/ru/books',
    );
    await page.getByRole('link', { name: 'Узнать о нас' }).click();
    await expect(page).toHaveURL(/\/ru\/about$/);
    await expect(page.getByRole('heading', { level: 1, name: 'О нас' })).toBeVisible();
  });

  test('catalog menu lists exactly the five official categories', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop menu');
    await page.goto('/ru');
    const nav = page.getByRole('navigation', { name: 'Меню' });
    await nav.getByRole('button', { name: 'Каталог' }).hover();
    const items = nav.locator('a[href*="category="], a[href$="/audiobooks"]');
    await expect(nav.getByRole('link', { name: 'Психология' })).toHaveAttribute(
      'href',
      '/ru/books?category=psychology',
    );
    await expect(nav.getByRole('link', { name: 'Саморазвитие' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Исламская литература' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Детские книги' })).toBeVisible();
    // «Аудиокниги» — и в каталоге, и отдельным пунктом меню
    await expect(nav.getByRole('link', { name: 'Аудиокниги' })).toHaveCount(2);
    await expect(items).toHaveCount(6);
    await expect(nav.getByRole('link', { name: 'Сообщество' })).toHaveAttribute(
      'href',
      '/ru#community',
    );
  });

  test('home shows exactly five category cards', async ({ page }) => {
    await page.goto('/ru');
    const cards = page
      .locator('#categories-title')
      .locator('xpath=ancestor::section')
      .getByRole('listitem');
    await expect(cards).toHaveCount(5);
    await expect(cards.last()).toContainText('Аудиокниги');
  });

  test('search finds real books and reports empty results', async ({ page }) => {
    await page.goto('/ru');
    await page.getByRole('button', { name: 'Поиск' }).click();
    const dialog = page.getByRole('dialog', { name: 'Поиск' });
    const input = dialog.getByRole('searchbox');
    await input.fill('Джамиля');
    await expect(dialog.getByRole('link', { name: /Джамиля/ }).first()).toBeVisible();
    await input.fill('несуществующаякнига');
    await expect(dialog.getByTestId('search-empty')).toHaveText(
      'По запросу «несуществующаякнига» ничего не найдено',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('footer links open real pages in both languages', async ({ page }) => {
    for (const [locale, titles] of [
      [
        'ru',
        [
          'О нас',
          'Контакты',
          'Доставка и оплата',
          'Политика конфиденциальности',
          'Условия использования',
        ],
      ],
      [
        'ky',
        ['Биз жөнүндө', 'Байланыш', 'Жеткирүү жана төлөм', 'Купуялык саясаты', 'Колдонуу шарттары'],
      ],
    ] as const) {
      for (const [index, path] of ['about', 'contacts', 'delivery', 'privacy', 'terms'].entries()) {
        const response = await page.goto(`/${locale}/${path}`);
        expect(response?.status(), path).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[index]);
      }
    }
  });

  test('delivery page shows tariffs from the API and contacts link to WhatsApp', async ({
    page,
  }) => {
    await page.goto('/ru/delivery');
    const options = page.getByTestId('delivery-options');
    await expect(options).toContainText('Самовывоз');
    await expect(options).toContainText('Бесплатно');
    await expect(options).toContainText('200 сом');
    await expect(options).toContainText('300 сом');

    await page.goto('/ru/contacts');
    await expect(page.getByRole('link', { name: 'Написать в WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/996779040589',
    );
    // Выдуманного адреса нет
    await expect(page.getByText('уточняйте в WhatsApp')).toBeVisible();
  });

  test('legal drafts are clearly marked', async ({ page }) => {
    await page.goto('/ru/privacy');
    await expect(page.getByRole('note')).toHaveText(
      'Черновик. Перед запуском текст должен проверить юрист.',
    );
  });
});
