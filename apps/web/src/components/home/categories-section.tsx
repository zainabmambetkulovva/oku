import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { CategoryNode } from '@/lib/types';
import { HornMotif } from '../ornaments/ornaments';
import { ArrowRight } from '../ui/button';
import { SectionHeading } from '../ui/section-heading';

/**
 * Иллюстрации для категорий, у которых в админке ещё нет своей картинки.
 * Ключ — slug категории (или его начало).
 */
const ILLUSTRATIONS: { match: RegExp; src: string; width: number; height: number }[] = [
  { match: /^psycholog/, src: '/illustrations/psychology.webp', width: 720, height: 468 },
  {
    match: /^self-dev|^samorazv/,
    src: '/illustrations/self-development.webp',
    width: 720,
    height: 512,
  },
  { match: /islam/, src: '/illustrations/islamic.webp', width: 720, height: 486 },
  { match: /^kids|^child|^detsk|^balda/, src: '/illustrations/kids.webp', width: 720, height: 485 },
];

function illustrationFor(slug: string) {
  return ILLUSTRATIONS.find(({ match }) => match.test(slug));
}

/** Плоский список: корневые категории и их подкатегории. */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

/** Наушники на стопке книг — для карточки «Аудиокниги». */
function HeadphonesArt() {
  return (
    <svg viewBox="0 0 240 190" className="h-[82%] w-auto" aria-hidden="true">
      <defs>
        <linearGradient id="hp-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf1" />
          <stop offset="1" stopColor="#e3cdb0" />
        </linearGradient>
        <linearGradient id="hp-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf3e6" />
          <stop offset="0.6" stopColor="#ead7bb" />
          <stop offset="1" stopColor="#c9a776" />
        </linearGradient>
        <linearGradient id="hp-book" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c5638" />
          <stop offset="1" stopColor="#56351f" />
        </linearGradient>
        <radialGradient id="hp-shadow">
          <stop offset="0" stopColor="#5b381e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#5b381e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="176" rx="96" ry="10" fill="url(#hp-shadow)" />
      {/* стопка книг */}
      <rect x="34" y="150" width="172" height="22" rx="4" fill="url(#hp-book)" />
      <rect x="34" y="150" width="172" height="5" rx="2" fill="#8d6733" />
      <rect x="44" y="130" width="154" height="20" rx="4" fill="#f1e4cf" />
      <path d="M50 140h140" stroke="#c49a5e" strokeWidth="1.2" />
      <rect x="40" y="112" width="160" height="18" rx="4" fill="#c49a5e" />
      <path d="M48 121h144" stroke="#f7e6c4" strokeWidth="1.2" strokeDasharray="4 3" />
      {/* оголовье */}
      <path
        d="M58 108V84a62 62 0 0 1 124 0v24"
        fill="none"
        stroke="#b88e57"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M58 108V84a62 62 0 0 1 124 0v24"
        fill="none"
        stroke="url(#hp-band)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* амбушюры */}
      <g>
        <rect
          x="38"
          y="74"
          width="40"
          height="52"
          rx="18"
          fill="url(#hp-cup)"
          stroke="#a77a3c"
          strokeWidth="1.5"
        />
        <rect x="70" y="80" width="12" height="40" rx="6" fill="#8d6733" />
        <rect
          x="162"
          y="74"
          width="40"
          height="52"
          rx="18"
          fill="url(#hp-cup)"
          stroke="#a77a3c"
          strokeWidth="1.5"
        />
        <rect x="158" y="80" width="12" height="40" rx="6" fill="#8d6733" />
        <circle cx="58" cy="100" r="7" fill="none" stroke="#c49a5e" strokeWidth="1.5" />
        <circle cx="182" cy="100" r="7" fill="none" stroke="#c49a5e" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function CategoryCard({
  href,
  label,
  ariaLabel,
  children,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group arch relative flex h-full flex-col overflow-hidden rounded-b-[1.6rem] border border-white/80 bg-gradient-to-b from-white/70 to-beige/80 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="relative grid aspect-[1/0.9] place-items-center overflow-hidden px-3 pt-6">
        {children}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-4">
        <h3 className="font-sans text-[0.85rem] leading-snug font-semibold text-ink">{label}</h3>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-cocoa shadow-sm transition group-hover:bg-cocoa group-hover:text-milk">
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

export async function CategoriesSection({ categories }: { categories: CategoryNode[] }) {
  const t = await getTranslations('categories');
  const ts = await getTranslations('sections');
  const items = flatten(categories)
    .filter(
      (category) =>
        category.booksCount + category.audiobooksCount > 0 || category.children.length > 0,
    )
    .slice(0, 4);

  const imageClass =
    'h-full w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-105';

  return (
    <section className="container-page mt-6 lg:mt-2" aria-labelledby="categories-title">
      <SectionHeading
        id="categories-title"
        title={ts('categories')}
        subtitle={ts('categoriesSubtitle')}
        action={
          <Link
            href="/books"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cocoa hover:text-gold-dark"
          >
            {ts('allCategories')} <ArrowRight />
          </Link>
        }
      />
      <ul className="scroll-row sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
        {items.map((category) => {
          const art = illustrationFor(category.slug);
          return (
            <li key={category.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
              <CategoryCard
                href={`/books?category=${category.slug}`}
                label={category.name}
                ariaLabel={`${t('open')}: ${category.name}`}
              >
                {category.imageUrl ? (
                  // Картинка категории, загруженная в админке
                  <img src={category.imageUrl} alt="" loading="lazy" className={imageClass} />
                ) : art ? (
                  <Image
                    src={art.src}
                    alt=""
                    width={art.width}
                    height={art.height}
                    sizes="(min-width: 1024px) 16vw, 45vw"
                    className={imageClass}
                  />
                ) : (
                  <HornMotif className="w-1/3 text-gold transition-transform duration-500 group-hover:scale-110" />
                )}
              </CategoryCard>
            </li>
          );
        })}
        <li className="w-[46%] shrink-0 snap-start sm:w-auto">
          <CategoryCard
            href="/audiobooks"
            label={t('audiobooks')}
            ariaLabel={`${t('open')}: ${t('audiobooks')}`}
          >
            <HeadphonesArt />
          </CategoryCard>
        </li>
      </ul>
    </section>
  );
}
