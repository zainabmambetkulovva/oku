import { safeNext } from './auth';

describe('safeNext', () => {
  it('keeps paths inside the site without the language prefix', () => {
    expect(safeNext('/ru/cart')).toBe('/cart');
    expect(safeNext('/ky/books?page=2')).toBe('/books?page=2');
    expect(safeNext('/ru')).toBe('/');
    expect(safeNext('/admin/books')).toBe('/admin/books');
    // «/russian-books» — не префикс языка
    expect(safeNext('/russian-books')).toBe('/russian-books');
  });

  it('rejects other sites', () => {
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('/\\evil.example')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});
