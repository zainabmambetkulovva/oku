import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageShell } from '@/components/pages/page-shell';

type Section = { title: string; text: string };

/** Дата редакции текста. Черновик — до проверки юристом. */
const UPDATED = '2026-11-14';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.privacy' });
  return { title: t('title') };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.privacy');
  const tp = await getTranslations('pages');
  const sections = t.raw('sections') as Section[];
  const date = new Date(`${UPDATED}T00:00:00`).toLocaleDateString('ru-RU');

  return (
    <PageShell title={t('title')} lead={t('updated', { date })}>
      <article className="card mx-auto max-w-3xl p-6 sm:p-10">
        <p role="note" className="mb-6 rounded-2xl bg-[#f6e3c4] px-4 py-3 text-sm text-cocoa">
          {tp('draft')}
        </p>
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-medium text-cocoa sm:text-xl">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/80 sm:text-base">
                {section.text}
              </p>
            </section>
          ))}
        </div>
      </article>
    </PageShell>
  );
}
