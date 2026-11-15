import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionTitle } from '@/components/account/account-pages';
import { ProfileForm } from '@/components/account/profile-forms';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('profile.title'), robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  return (
    <>
      <SectionTitle>{t('profile.title')}</SectionTitle>
      <ProfileForm />
    </>
  );
}
