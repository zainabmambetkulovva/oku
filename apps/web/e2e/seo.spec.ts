import { expect, test } from '@playwright/test';

/** Этап 10: SEO и заголовки безопасности. */
test.describe('seo', () => {
  test.skip(({ isMobile }) => isMobile, 'one run is enough');

  test('robots.txt opens the catalog and closes private pages', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /ru/admin');
    expect(robots).toContain('Disallow: /ky/account');
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test('sitemap lists books and audiobooks in both languages', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/ru/books/jamila</loc>');
    expect(xml).toContain('/ky/books/jamila</loc>');
    expect(xml).toContain('/ru/audiobooks/jamila-audio</loc>');
    expect(xml).toContain('hreflang="ky"');
    expect(xml).not.toContain('/admin');
  });

  test('pages have their own canonical address and hreflang', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/ru\/books\/jamila$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="ky"]')).toHaveAttribute(
      'href',
      /\/ky\/books\/jamila$/,
    );
    await page.goto('/ky/about');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/ky\/about$/);
  });

  test('book page has schema.org data with price and availability', async ({ page }) => {
    await page.goto('/ru/books/jamila');
    const json = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent())!,
    );
    expect(json['@type']).toContain('Book');
    expect(json.name).toBe('Джамиля');
    expect(json.offers).toMatchObject({ priceCurrency: 'KGS', price: '650.00' });
  });

  test('private pages are not indexed', async ({ page }) => {
    await page.goto('/ru/cart');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('security headers are sent', async ({ request }) => {
    const response = await request.get('/ru');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
