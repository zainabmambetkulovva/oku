import { useTranslations } from 'next-intl';
import { HornMotif } from '@/components/ornaments/ornaments';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <section className="container-page flex flex-col items-center py-24 text-center">
      <HornMotif className="w-20 text-gold" />
      <h1 className="mt-6 text-4xl font-semibold">{t('title')}</h1>
      <p className="mt-3 max-w-md text-muted">{t('text')}</p>
      <Link href="/" className={`${buttonClasses('primary')} mt-8`}>
        {t('home')}
      </Link>
    </section>
  );
}
