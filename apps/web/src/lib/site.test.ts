import { OFFICIAL_CATEGORIES, SITE_CONTACTS } from './site';

describe('site contacts', () => {
  it('builds a wa.me link from the WhatsApp number', () => {
    expect(SITE_CONTACTS.whatsapp).toBe('+996 779 040 589');
    expect(SITE_CONTACTS.whatsappUrl).toBe('https://wa.me/996779040589');
  });

  it('lists exactly the five official categories', () => {
    expect(OFFICIAL_CATEGORIES.map((category) => category.key)).toEqual([
      'psychology',
      'self-development',
      'islamic-literature',
      'kids',
      'audiobooks',
    ]);
  });
});
