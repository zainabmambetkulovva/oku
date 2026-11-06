import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ChevronDown } from '../ui/icons';
import { HeaderActions } from './header-actions';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';

export async function Header() {
  const t = await getTranslations('nav');
  const linkClass =
    'relative py-2 text-sm font-medium text-ink/85 transition-colors hover:text-forest';

  return (
    <header className="sticky top-0 z-40 border-b border-sand/50 bg-milk/90 backdrop-blur supports-[backdrop-filter]:bg-milk/75">
      <div className="container-page relative flex h-16 items-center gap-3 lg:h-20">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2 text-forest" aria-label="OKU24">
          <Logo className="h-6 lg:h-7" />
        </Link>

        <nav aria-label={t('menu')} className="ml-8 hidden items-center gap-7 lg:flex">
          <Link
            href="/"
            className={`${linkClass} text-forest after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-forest`}
          >
            {t('home')}
          </Link>
          <div className="group relative">
            <button
              type="button"
              className={`${linkClass} flex items-center gap-1`}
              aria-haspopup="true"
            >
              {t('catalog')} <ChevronDown />
            </button>
            <div className="invisible absolute top-full left-0 z-30 w-56 translate-y-1 rounded-2xl border border-sand/60 bg-milk p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <Link href="/books" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-beige">
                {t('books')}
              </Link>
              <Link
                href="/audiobooks"
                className="block rounded-xl px-3 py-2.5 text-sm hover:bg-beige"
              >
                {t('audiobooks')}
              </Link>
            </div>
          </div>
          <Link href="/#about" className={linkClass}>
            {t('about')}
          </Link>
          <Link href="/#delivery" className={linkClass}>
            {t('delivery')}
          </Link>
          <Link href="/#contacts" className={linkClass}>
            {t('contacts')}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <HeaderActions />
          <LanguageSwitcher className="hidden text-forest sm:flex" />
        </div>
      </div>
    </header>
  );
}
