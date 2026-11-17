import { routing } from '@/i18n/routing';

/**
 * Публичный адрес сайта для ссылок в метаданных, sitemap и разметке.
 * NEXT_PUBLIC_SITE_URL — свой домен; на Vercel без него — адрес продакшн-проекта.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3001';
}

/** Канонический адрес страницы и её версии на других языках (hreflang). */
export function alternates(locale: string, path: string) {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((code) => [code, `/${code}${clean}`])),
      'x-default': `/${routing.defaultLocale}${clean}`,
    },
  };
}

interface ProductForSchema {
  slug: string;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  language: string | null;
  price: number;
  rating: { average: number | null; count: number };
}

/**
 * Разметка schema.org для страницы книги или аудиокниги: название, автор, цена в сомах,
 * наличие, оценка. Поисковики показывают её в результатах (цена, звёзды).
 */
export function productJsonLd(
  locale: string,
  product: ProductForSchema &
    (
      | { kind: 'book'; isbn: string | null; pages: number | null; inStock: boolean }
      | { kind: 'audiobook'; narrator: string | null; durationSeconds: number }
    ),
) {
  const url = `${siteUrl()}/${locale}/${product.kind === 'book' ? 'books' : 'audiobooks'}/${product.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': product.kind === 'book' ? ['Book', 'Product'] : ['Audiobook', 'Product'],
    name: product.title,
    url,
    author: { '@type': 'Person', name: product.author },
    ...(product.description && { description: product.description.slice(0, 500) }),
    ...(product.coverUrl && { image: product.coverUrl }),
    ...(product.language && { inLanguage: product.language }),
    ...(product.kind === 'book' && product.isbn && { isbn: product.isbn }),
    ...(product.kind === 'book' && product.pages && { numberOfPages: product.pages }),
    ...(product.kind === 'audiobook' &&
      product.narrator && { readBy: { '@type': 'Person', name: product.narrator } }),
    ...(product.kind === 'audiobook' && {
      duration: `PT${Math.max(1, Math.round(product.durationSeconds / 60))}M`,
    }),
    offers: {
      '@type': 'Offer',
      url,
      price: (product.price / 100).toFixed(2),
      priceCurrency: 'KGS',
      availability:
        product.kind === 'audiobook' || product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'OKU24' },
    },
    ...(product.rating.count > 0 &&
      product.rating.average !== null && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating.average.toFixed(1),
          reviewCount: product.rating.count,
        },
      }),
  };
}

/** JSON для <script type="application/ld+json">: без закрывающего тега внутри текста. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
