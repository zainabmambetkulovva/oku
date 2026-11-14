import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { OFFICIAL_CATEGORIES, PICKUP, SITE_CONTACTS } from '@/lib/site';
import { NewsletterForm } from '../home/newsletter';
import { CornerOrnament } from '../ornaments/ornaments';
import { HeartIcon, InstagramIcon, MailIcon, PhoneIcon } from '../ui/icons';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';

function WhatsAppIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9.5 9.5c.3 1.6 2.4 3.7 4 4l1-1 1.7.8c-.2 1-1 1.7-2 1.7-2.8-.2-5.5-2.9-5.7-5.7 0-1 .7-1.8 1.7-2l.8 1.7z" />
    </svg>
  );
}

/** Тёмный «библиотечный» подвал: каталог, покупателям, соцсети, подписка, языки. */
export async function Footer() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const tc = await getTranslations('categories.defaults');
  const tp = await getTranslations('pickup');
  const linkClass = 'transition-colors hover:text-gold-light';
  const heading = 'mb-4 font-display text-lg text-gold-light';

  return (
    <footer
      id="contacts"
      className="relative mt-20 scroll-mt-24 overflow-hidden bg-cocoa-900 text-milk/85"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <CornerOrnament className="absolute -top-12 -left-12 size-48 text-gold/25" />
        <CornerOrnament className="absolute -right-12 -bottom-12 size-48 text-gold/25" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </div>

      <div className="container-page relative grid gap-10 pt-14 pb-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_1fr_1.3fr]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="OKU24">
            <LogoBadge className="size-14 rounded-full ring-2 ring-gold/40" />
            <span className="font-display text-2xl text-gold-light">OKU24</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-milk/65">{t('tagline')}</p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <a
                href={SITE_CONTACTS.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 ${linkClass}`}
              >
                <WhatsAppIcon />
                {SITE_CONTACTS.whatsapp}
              </a>
            </li>
            <li>
              <a
                href={SITE_CONTACTS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 ${linkClass}`}
              >
                <InstagramIcon className="size-4" />
                {SITE_CONTACTS.instagramHandle}
              </a>
            </li>
            <li className="text-milk/70">
              {tp('address')}
              <br />
              {tp('hours', { hours: PICKUP.hours })}
            </li>
            {SITE_CONTACTS.phone && (
              <li>
                <a
                  href={`tel:${SITE_CONTACTS.phone.replace(/[^\d+]/g, '')}`}
                  className={`flex items-center gap-2 ${linkClass}`}
                >
                  <PhoneIcon className="size-4" />
                  {SITE_CONTACTS.phone}
                </a>
              </li>
            )}
            {SITE_CONTACTS.email && (
              <li>
                <a
                  href={`mailto:${SITE_CONTACTS.email}`}
                  className={`flex items-center gap-2 ${linkClass}`}
                >
                  <MailIcon className="size-4" />
                  {SITE_CONTACTS.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <nav aria-label={t('catalog')}>
          <h2 className={heading}>{t('catalog')}</h2>
          <ul className="space-y-2.5 text-sm">
            {OFFICIAL_CATEGORIES.map((category) => (
              <li key={category.key}>
                <Link href={category.href} className={linkClass}>
                  {tc(category.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('buyers')}>
          <h2 className={heading}>{t('buyers')}</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/about" className={linkClass}>
                {nav('about')}
              </Link>
            </li>
            <li>
              <Link href="/#community" className={linkClass}>
                {nav('community')}
              </Link>
            </li>
            <li>
              <Link href="/contacts" className={linkClass}>
                {nav('contacts')}
              </Link>
            </li>
            <li>
              <Link href="/delivery" className={linkClass}>
                {nav('delivery')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {nav('privacy')}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                {nav('terms')}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className={heading}>{t('newsletterTitle')}</h2>
          <NewsletterForm />
          <LanguageSwitcher className="mt-6 text-milk" />
        </div>
      </div>

      <div className="relative border-t border-milk/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-milk/55 sm:flex-row sm:justify-between">
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
          <p className="flex items-center gap-1.5">
            {t('tagline')} <HeartIcon filled className="size-3.5 text-gold" />
          </p>
        </div>
      </div>
    </footer>
  );
}
