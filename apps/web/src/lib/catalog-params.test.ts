import { apiQuery, normalizeParams, pageHref } from './catalog-params';

describe('catalog params', () => {
  it('drops invalid values and converts som to tyiyn for the API', () => {
    const params = normalizeParams({
      category: 'psychology',
      language: 'de',
      minPrice: '300',
      maxPrice: 'abc',
      sort: 'random',
      page: '-1',
      inStock: 'true',
    });
    expect(params).toMatchObject({
      category: 'psychology',
      language: undefined,
      sort: 'newest',
      page: '1',
    });
    expect(apiQuery(params, 'books')).toBe(
      'sort=newest&page=1&limit=12&category=psychology&minPrice=30000&inStock=true',
    );
    expect(apiQuery(params, 'audiobooks')).not.toContain('inStock');
  });

  it('builds clean links and resets the page on filter changes', () => {
    const params = normalizeParams({ category: 'kids', page: '3' });
    expect(pageHref('/books', params, { sort: 'price_asc' })).toBe(
      '/books?category=kids&sort=price_asc',
    );
    expect(pageHref('/books', params, { page: '2' })).toBe('/books?category=kids&page=2');
    expect(pageHref('/books', normalizeParams({}), {})).toBe('/books');
  });
});
