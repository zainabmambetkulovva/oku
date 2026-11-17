import { alternates, jsonLdString, productJsonLd } from './seo';

describe('seo helpers', () => {
  it('builds canonical and hreflang addresses for both languages', () => {
    expect(alternates('ru', '/books/jamila')).toEqual({
      canonical: '/ru/books/jamila',
      languages: {
        ky: '/ky/books/jamila',
        ru: '/ru/books/jamila',
        'x-default': '/ky/books/jamila',
      },
    });
    expect(alternates('ky', '/').canonical).toBe('/ky');
  });

  it('describes a book with price in som, availability and rating', () => {
    const data = productJsonLd('ky', {
      kind: 'book',
      slug: 'jamila',
      title: 'Джамиля',
      author: 'Чингиз Айтматов',
      description: null,
      coverUrl: null,
      language: 'ru',
      price: 65_000,
      isbn: '978-5-17-090332-0',
      pages: 120,
      inStock: false,
      rating: { average: 4.5, count: 2 },
    });
    expect(data['@type']).toEqual(['Book', 'Product']);
    expect(data.offers).toMatchObject({
      price: '650.00',
      priceCurrency: 'KGS',
      availability: 'https://schema.org/OutOfStock',
    });
    expect(data.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: 2,
    });
    expect(data.url).toMatch(/\/ky\/books\/jamila$/);
  });

  it('cannot break out of the script tag', () => {
    expect(jsonLdString({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
