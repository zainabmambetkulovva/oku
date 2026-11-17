import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/** Поисковикам — каталог и информационные страницы; кабинет, корзина, заказы и админка закрыты. */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    'admin',
    'account',
    'cart',
    'checkout',
    'orders',
    'favorites',
    'login',
    'register',
    'auth',
  ];
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        ...['ky', 'ru'].flatMap((locale) => privatePaths.map((path) => `/${locale}/${path}`)),
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
