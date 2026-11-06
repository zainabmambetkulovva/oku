import { render, screen } from '@testing-library/react';
import { coverColors } from '@/lib/cover-palette';
import { BookCover } from './book-cover';

describe('BookCover', () => {
  it('shows the uploaded cover image', () => {
    render(
      <BookCover
        slug="jamila"
        title="Джамиля"
        author="Айтматов"
        coverUrl="https://cdn.oku24.kg/c.webp"
      />,
    );
    const image = screen.getByRole('img', { name: 'Джамиля' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe('https://cdn.oku24.kg/c.webp');
    expect(image.getAttribute('loading')).toBe('lazy');
  });

  it('draws a placeholder with title and author when there is no cover', () => {
    render(
      <BookCover slug="shakhmat" title="Шахмат новелласы" author="Стефан Цвейг" coverUrl={null} />,
    );
    const cover = screen.getByRole('img', { name: 'Шахмат новелласы' });
    expect(cover.tagName).toBe('DIV');
    expect(cover.textContent).toContain('Стефан Цвейг');
    expect(cover.style.background).not.toBe('');
  });

  it('picks the same placeholder colors for the same book everywhere', () => {
    expect(coverColors('shakhmat')).toEqual(coverColors('shakhmat'));
  });
});
