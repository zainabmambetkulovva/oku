import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { OFFICIAL_CATEGORIES } from '@/lib/site';
import { ChevronDown } from '../ui/icons';
import { HeaderActions } from './header-actions';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';
import { MobileMenu } from './mobile-menu';

/**
 * Шапка: логотип, «Каталог» с пятью официальными категориями, книги, аудиокниги,
 * сообщество, о нас, контакты, языки, поиск, избранное, корзина, кабинет.
 */
export async function Header() {
  const t = await getTranslations('nav');
  const tc = await getTranslations('categories.defaults');
  const linkClass =
    'relative py-2 text-[0.82rem] font-medium text-ink/85 transition-colors hover:text-cocoa-500 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform hover:after:scale-x-100';

  return (
    <header className="sticky top-0 z-40 bg-[#fbe8d8]/75 backdrop-blur-md supports-[backdrop-filter]:bg-[#fbe8d8]/55">
      <div className="container-page relative flex h-16 items-center gap-3 lg:h-[4.75rem]">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2.5" aria-label="OKU24">
          <LogoBadge className="size-10 drop-shadow-sm transition-transform hover:scale-105 lg:size-12" />
        </Link>

        <nav
          aria-label={t('menu')}
          className="ml-6 hidden items-center gap-6 lg:flex xl:ml-10 xl:gap-7"
        >
          <div className="group relative">
            <button
              type="button"
              className={`${linkClass} flex items-center gap-1`}
              aria-haspopup="true"
            >
              {t('catalog')} <ChevronDown />
            </button>
            <div className="invisible absolute top-full left-0 z-30 w-64 translate-y-1 rounded-3xl border border-white/70 bg-milk/95 p-2 opacity-0 shadow-xl backdrop-blur transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {OFFICIAL_CATEGORIES.map((category) => (
                <Link
                  key={category.key}
                  href={category.href}
                  className="block rounded-2xl px-3 py-2.5 text-sm text-ink/85 transition hover:bg-beige/70 hover:pl-4"
                >
                  {tc(category.key)}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/books" className={linkClass}>
            {t('books')}
          </Link>
          <Link href="/audiobooks" className={linkClass}>
            {t('audiobooks')}
          </Link>
          <Link href="/#community" className={linkClass}>
            {t('community')}
          </Link>
          <Link href="/about" className={linkClass}>
            {t('about')}
          </Link>
          <Link href="/contacts" className={linkClass}>
            {t('contacts')}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-5">
          <LanguageSwitcher className="hidden text-cocoa sm:flex" />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
