import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ESLint и проверка типов — отдельными шагами CI (pnpm lint, pnpm typecheck)
  eslint: { ignoreDuringBuilds: true },
  // Картинки уже сжаты в webp; без серверной обработки они надёжно отдаются и на Vercel (сервисы)
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Только HTTPS на год (браузер игнорирует заголовок на http://localhost)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Магазину не нужны камера, микрофон, геолокация и т.п.
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
