import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it.each([
    ['Белый пароход', 'belyi-parohod'],
    ['Джамиля', 'dzhamilya'],
    ['Манас — эпос', 'manas-epos'],
    ['Күн, түн жана өмүр', 'kun-tun-zhana-omur'],
    ['Ңамыс', 'namys'],
    ['Clean Code: 2nd Edition!', 'clean-code-2nd-edition'],
    ['  --Ёлка  ', 'elka'],
    ['Café crème', 'cafe-creme'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('falls back for titles without letters or digits', () => {
    expect(slugify('—!?')).toBe('item');
  });

  it('limits the length to 80 characters without a trailing hyphen', () => {
    const slug = slugify('книга '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).not.toMatch(/-$/);
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    await expect(uniqueSlug('Джамиля', async () => false)).resolves.toBe('dzhamilya');
  });

  it('adds a numeric suffix when the slug is taken', async () => {
    const taken = new Set(['dzhamilya', 'dzhamilya-2']);
    await expect(uniqueSlug('Джамиля', async (slug) => taken.has(slug))).resolves.toBe(
      'dzhamilya-3',
    );
  });
});
