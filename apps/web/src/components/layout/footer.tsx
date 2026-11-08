import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CornerOrnament } from '../ornaments/ornaments';
import { HeartIcon, InstagramIcon, MailIcon, PhoneIcon } from '../ui/icons';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';

/** Тёмно-коричневый подвал с орнаментами по углам, как в макете. */
export async function Footer() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/oku_24/';
  const links = [
    { href: '/books', label: nav('catalog') },
    { href: '/books', label: nav('books') },
    { href: '/audiobooks', label: nav('audiobooks') },
    { href: '/#about', label: nav('about') },
  ];
  const linkClass = 'transition-colors hover:text-gold-light';

  return (
    <footer
      id="contacts"
      className="relative mt-14 scroll-mt-24 overflow-hidden bg-cocoa-900 text-milk/85"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <CornerOrnament className="absolute -top-12 -left-12 size-48 text-gold/25" />
        <CornerOrnament className="absolute -right-12 -bottom-12 size-48 text-gold/25" />
      </div>
      <div className="container-page relative flex flex-col gap-8 pt-12 pb-8 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="OKU24">
          <LogoBadge className="size-14 rounded-full ring-2 ring-gold/40" />
          <span className="font-display text-2xl text-gold-light">OKU24</span>
        </Link>
        <nav aria-label={t('navigation')}>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {links.map((link, index) => (
              <li key={index}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-6">
          {phone && (
            <a
              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
              className={`flex items-center gap-2 ${linkClass}`}
            >
              <PhoneIcon className="size-4" />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className={`flex items-center gap-2 ${linkClass}`}>
              <MailIcon className="size-4" />
              {email}
            </a>
          )}
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 ${linkClass}`}
          >
            <InstagramIcon className="size-4" />
            @oku_24
          </a>
          <LanguageSwitcher className="text-milk" />
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
