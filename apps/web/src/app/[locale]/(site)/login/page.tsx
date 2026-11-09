import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { CornerOrnament } from '@/components/ornaments/ornaments';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('title'), robots: { index: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <section className="container-page relative flex justify-center py-16 sm:py-24">
      <div className="card relative w-full max-w-md overflow-hidden p-8 sm:p-10">
        <CornerOrnament className="pointer-events-none absolute -top-10 -right-10 size-32 text-gold/30" />
        <h1 className="text-3xl font-medium text-cocoa">{t('title')}</h1>
        <p className="mt-2 text-sm text-ink/70">{t('subtitle')}</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
