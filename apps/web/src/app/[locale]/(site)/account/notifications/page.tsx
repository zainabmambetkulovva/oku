import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationsList, SectionTitle } from '@/components/account/account-pages';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('notifications.title'), robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  return (
    <>
      <SectionTitle>{t('notifications.title')}</SectionTitle>
      <NotificationsList />
    </>
  );
}
