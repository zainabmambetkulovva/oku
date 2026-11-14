import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { readingRoom } from '@/assets/illustrations';
import { PageSection, PageShell } from '@/components/pages/page-shell';
import { ArrowRight, buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type Section = { title: string; text: string };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.about' });
  return { title: t('title'), description: t('lead') };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.about');
  const tn = await getTranslations('nav');
  const th = await getTranslations('hero');
  const sections = t.raw('sections') as Section[];

  return (
    <PageShell title={t('title')} lead={t('lead')}>
      <div className="mx-auto max-w-4xl">
        <Image
          src={readingRoom}
          alt=""
          sizes="(min-width: 1024px) 56rem, 100vw"
          className="mx-auto h-auto w-full max-w-3xl drop-shadow-[0_24px_30px_rgb(91_56_30/0.25)]"
          priority
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {sections.map((section, index) => (
            <div key={section.title} className={index === 0 ? 'md:col-span-2' : ''}>
              <PageSection title={section.title}>
                <p>{section.text}</p>
              </PageSection>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/books" className={buttonClasses('primary', 'magnetic')}>
            {th('explore')} <ArrowRight />
          </Link>
          <Link href="/contacts" className={buttonClasses('outline', 'magnetic')}>
            {tn('contacts')}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
