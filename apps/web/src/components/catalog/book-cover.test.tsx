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

  it('uses the store cover for a matching title when none is uploaded', () => {
    render(<BookCover slug="bilimpoz" title="Билимпоз" author="OKU24" coverUrl={null} />);
    expect(screen.getByRole('img', { name: 'Билимпоз' }).getAttribute('src')).toBe(
      '/covers/flat/bilimpoz.webp',
    );
    expect(screen.queryByTestId('audio-badge')).toBeNull();
  });

  it('prefers the uploaded cover over the store cover', () => {
    render(
      <BookCover slug="bilimpoz" title="Билимпоз" author="OKU24" coverUrl="https://cdn/x.webp" />,
    );
    expect(screen.getByRole('img', { name: 'Билимпоз' }).getAttribute('src')).toBe(
      'https://cdn/x.webp',
    );
  });

  it('marks audiobooks with the audio badge', () => {
    render(<BookCover slug="bilimpoz" title="Билимпоз" author="OKU24" coverUrl={null} square />);
    expect(screen.getByRole('img', { name: 'Билимпоз' }).getAttribute('src')).toBe(
      '/covers/flat/bilimpoz.webp',
    );
    expect(screen.getByTestId('audio-badge')).toBeTruthy();
  });
});
