import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { footerBook } from '@/assets/illustrations';
import { Link } from '@/i18n/navigation';
import { OFFICIAL_CATEGORIES, PICKUP, SITE_CONTACTS } from '@/lib/site';
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

/** Искры над летящей страницей: позиции в процентах от картинки книги. */
const SPARKS = [
  { left: '79%', top: '7%', size: 22, delay: '0s' },
  { left: '87%', top: '-1%', size: 12, delay: '0.9s' },
  { left: '90%', top: '10%', size: 8, delay: '1.7s' },
  { left: '85%', top: '15%', size: 6, delay: '0.4s' },
];

/** Раскрытая книга в подвале: медленно парит, над страницей мерцают искры. */
function FooterBook() {
  return (
    <div
      className="relative mx-auto mt-8 w-full max-w-[15rem] motion-safe:animate-float [animation-duration:8s] sm:max-w-[17rem] md:mx-0 lg:mt-6"
      aria-hidden="true"
    >
      {/* тёплое свечение под книгой */}
      <span className="absolute inset-x-[10%] top-[30%] bottom-[5%] rounded-full bg-gold/25 blur-2xl" />
      <Image
        src={footerBook}
        alt=""
        width={900}
        height={638}
        sizes="17rem"
        className="relative h-auto w-full drop-shadow-[0_18px_22px_rgb(0_0_0/0.45)]"
      />
      {SPARKS.map((spark) => (
        <span
          key={spark.left + spark.top}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff6d6_0%,#ffc35a_35%,rgb(255_150_40/0.35)_60%,transparent_72%)] motion-safe:animate-[twinkle_2.6s_ease-in-out_infinite]"
          style={{
            left: spark.left,
            top: spark.top,
            width: spark.size,
            height: spark.size,
            animationDelay: spark.delay,
          }}
        />
      ))}
    </div>
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

      {/* На телефоне: контакты во всю ширину, «Каталог» и «Покупателям» — в два столбца рядом */}
      <div className="container-page relative grid grid-cols-2 gap-x-6 gap-y-10 pt-14 pb-10 lg:grid-cols-[1.2fr_0.9fr_1fr_1.3fr]">
        <div className="col-span-2 lg:col-span-1">
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
              <Link href="/community" className={linkClass}>
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

        <div className="col-span-2 flex flex-col lg:col-span-1">
          <LanguageSwitcher className="text-milk" />
          <FooterBook />
        </div>
      </div>

      <div className="relative border-t border-milk/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-milk/75 sm:flex-row sm:justify-between">
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
          <p className="flex items-center gap-1.5">
            {t('tagline')} <HeartIcon filled className="size-3.5 text-gold" />
          </p>
        </div>
      </div>
    </footer>
  );
}
