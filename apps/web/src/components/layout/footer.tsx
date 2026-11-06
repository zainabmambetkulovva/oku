import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CornerOrnament } from '../ornaments/ornaments';
import { MountainSilhouette } from '../ornaments/landscape';
import { InstagramIcon, MailIcon, PhoneIcon } from '../ui/icons';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';

/** Тёмно-зелёный подвал с силуэтом гор и орнаментом, как в макете. */
export async function Footer() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/oku_24/';

  return (
    <footer id="contacts" className="relative mt-28 bg-forest text-milk/90 sm:mt-36">
      <MountainSilhouette className="pointer-events-none absolute inset-x-0 bottom-full h-16 w-full translate-y-px text-forest sm:h-24" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -right-10 -bottom-10 size-56 text-gold/30" />
      </div>
      <div className="container-page relative grid gap-10 pt-12 pb-10 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div>
          <Logo className="h-8 text-milk" />
          <p className="mt-3 text-sm text-milk/70">{t('tagline')}</p>
        </div>
        <nav aria-label={t('navigation')}>
          <h2 className="mb-3 font-sans text-sm font-bold text-milk">{t('navigation')}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-gold-light">
                {nav('home')}
              </Link>
            </li>
            <li>
              <Link href="/books" className="hover:text-gold-light">
                {nav('books')}
              </Link>
            </li>
            <li>
              <Link href="/audiobooks" className="hover:text-gold-light">
                {nav('audiobooks')}
              </Link>
            </li>
            <li>
              <Link href="/#about" className="hover:text-gold-light">
                {nav('about')}
              </Link>
            </li>
            <li>
              <Link href="/#delivery" className="hover:text-gold-light">
                {nav('delivery')}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 font-sans text-sm font-bold text-milk">{t('contacts')}</h2>
          <ul className="space-y-3 text-sm">
            {phone && (
              <li>
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-2 hover:text-gold-light"
                >
                  <PhoneIcon className="size-4" />
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 hover:text-gold-light"
                >
                  <MailIcon className="size-4" />
                  {email}
                </a>
              </li>
            )}
            <li>
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-gold-light"
              >
                <InstagramIcon className="size-4" />
                @oku_24
              </a>
            </li>
          </ul>
        </div>
        <LanguageSwitcher className="text-milk md:justify-end md:self-start" />
      </div>
      <div className="relative border-t border-milk/10">
        <p className="container-page py-5 text-xs text-milk/60">
          {t('rights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
