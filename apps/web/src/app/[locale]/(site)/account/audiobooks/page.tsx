import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Library, ListeningHistory, SectionTitle } from '@/components/account/account-pages';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('audiobooks.title'), robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle>{t('audiobooks.title')}</SectionTitle>
        <Library />
      </section>
      <section>
        <SectionTitle>{t('audiobooks.history')}</SectionTitle>
        <ListeningHistory limit={10} />
      </section>
    </div>
  );
}
