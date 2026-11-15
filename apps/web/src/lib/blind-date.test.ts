import { teaser } from './blind-date';

describe('blind date teaser', () => {
  it('hides the title and the author', () => {
    const text = teaser({
      title: 'Джамиля',
      author: 'Чингиз Айтматов',
      description: 'Повесть «Джамиля» — история любви. Чингиз Айтматов написал её в 1958 году.',
    });
    expect(text).not.toMatch(/Джамиля|Айтматов/);
    expect(text).toContain('история любви');
    expect(text).not.toMatch(/[.!?]$/);
  });

  it('cuts long descriptions on a word boundary and handles empty ones', () => {
    const long = teaser({ title: 'X', author: 'Y', description: 'слово '.repeat(60) }, 30)!;
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith(' ')).toBe(false);
    expect(teaser({ title: 'X', author: 'Y', description: null })).toBeNull();
  });
});
