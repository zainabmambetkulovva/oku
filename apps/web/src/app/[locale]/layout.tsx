import '@fontsource/noto-serif-display/500.css';
import '@fontsource/noto-serif-display/600.css';
import '@fontsource/noto-serif-display/700.css';
import '@fontsource-variable/manrope';
import '../globals.css';

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { QueryProvider } from '@/providers/query-provider';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: `%s — OKU24` },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`])),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale,
      siteName: 'OKU24',
      type: 'website',
    },
  };
}

export const viewport: Viewport = { themeColor: '#3a2318' };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
