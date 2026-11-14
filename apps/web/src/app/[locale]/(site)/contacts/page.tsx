import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { communityArch } from '@/assets/illustrations';
import { PageShell } from '@/components/pages/page-shell';
import { buttonClasses } from '@/components/ui/button';
import { InstagramIcon } from '@/components/ui/icons';
import { SITE_CONTACTS } from '@/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.contacts' });
  return { title: t('title'), description: t('lead') };
}

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.contacts');

  return (
    <PageShell title={t('title')} lead={t('lead')}>
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <section className="card lift flex flex-col items-start p-7">
          <h2 className="text-2xl font-medium text-cocoa">WhatsApp</h2>
          <p className="mt-1 text-sm text-ink/70">{t('whatsappText')}</p>
          <p className="mt-4 font-display text-2xl text-cocoa-700">{SITE_CONTACTS.whatsapp}</p>
          <a
            href={SITE_CONTACTS.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('primary', 'magnetic mt-6')}
          >
            {t('write')}
          </a>
        </section>
        <section className="card lift flex flex-col items-start p-7">
          <h2 className="text-2xl font-medium text-cocoa">Instagram</h2>
          <p className="mt-1 text-sm text-ink/70">{t('instagramText')}</p>
          <p className="mt-4 font-display text-2xl text-cocoa-700">
            {SITE_CONTACTS.instagramHandle}
          </p>
          <a
            href={SITE_CONTACTS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('outline', 'magnetic mt-6')}
          >
            <InstagramIcon className="size-4" />
            {t('open')}
          </a>
        </section>
        <div className="card flex flex-col items-center gap-4 p-6 text-center md:col-span-2 md:flex-row md:text-left">
          <Image src={communityArch} alt="" sizes="16rem" className="h-auto w-56 shrink-0" />
          <p className="text-sm leading-relaxed text-ink/80 sm:text-base">{t('pickup')}</p>
        </div>
      </div>
    </PageShell>
  );
}
