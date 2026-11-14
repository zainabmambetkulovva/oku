import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { TestPayment } from '@/components/checkout/test-payment';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'testPayment' });
  return { title: t('title'), robots: { index: false } };
}

/** Тестовая «страница оплаты» для разработки и автотестов (провайдер test). */
export default async function TestPaymentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('testPayment');
  return (
    <AuthCard title={t('title')}>
      <Suspense>
        <TestPayment />
      </Suspense>
    </AuthCard>
  );
}
