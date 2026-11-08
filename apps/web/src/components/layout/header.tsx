import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { apiFetch, safely } from '@/lib/api';
import type { CategoryNode } from '@/lib/types';
import { ChevronDown } from '../ui/icons';
import { HeaderActions } from './header-actions';
import { LanguageSwitcher } from './language-switcher';
import { LogoBadge } from './logo';
import { MobileMenu } from './mobile-menu';

/** Шапка как в макете: логотип, меню с выпадающим каталогом, языки и значки. */
export async function Header() {
  const t = await getTranslations('nav');
  const categories = await safely(
    () => apiFetch<CategoryNode[]>('/categories'),
    [],
    'header categories',
  );
  const linkClass =
    'relative py-2 text-[0.82rem] font-medium text-ink/85 transition-colors hover:text-cocoa-500';

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-milk/80 backdrop-blur-md supports-[backdrop-filter]:bg-milk/65">
      <div className="container-page relative flex h-16 items-center gap-3 lg:h-[4.75rem]">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2.5" aria-label="OKU24">
          <LogoBadge className="size-10 drop-shadow-sm lg:size-12" />
        </Link>

        <nav aria-label={t('menu')} className="ml-6 hidden items-center gap-7 lg:flex xl:ml-10">
          <div className="group relative">
            <button
              type="button"
              className={`${linkClass} flex items-center gap-1`}
              aria-haspopup="true"
            >
              {t('catalog')} <ChevronDown />
            </button>
            <div className="invisible absolute top-full left-0 z-30 w-64 translate-y-1 rounded-3xl border border-white/70 bg-milk/95 p-2 opacity-0 shadow-xl backdrop-blur transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <Link
                href="/books"
                className="block rounded-2xl px-3 py-2.5 text-sm hover:bg-beige/70"
              >
                {t('books')}
              </Link>
              <Link
                href="/audiobooks"
                className="block rounded-2xl px-3 py-2.5 text-sm hover:bg-beige/70"
              >
                {t('audiobooks')}
              </Link>
              {categories.length > 0 && <hr className="mx-3 my-1 border-sand/60" />}
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={`/books?category=${category.slug}`}
                  className="block rounded-2xl px-3 py-2 text-sm text-ink/80 hover:bg-beige/70"
                >
                  {category.name}
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
          <Link href="/#about" className={linkClass}>
            {t('about')}
          </Link>
          <Link href="/#contacts" className={linkClass}>
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
