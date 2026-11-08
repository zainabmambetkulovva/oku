import Image, { type StaticImageData } from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { CategoryNode } from '@/lib/types';
import { Butterfly, LeafBranch } from '../ornaments/decor';
import { HornMotif } from '../ornaments/ornaments';
import { ArrowRight } from '../ui/button';
import { SectionHeading } from '../ui/section-heading';
import { audiobooks, islamic, kids, psychology, selfDevelopment } from '@/assets/illustrations';

/**
 * Иллюстрации для категорий, у которых в админке ещё нет своей картинки.
 * Ключ — slug категории (или его начало).
 */
const ILLUSTRATIONS: { match: RegExp; src: StaticImageData; width: number; height: number }[] = [
  { match: /^psycholog/, src: psychology, width: 720, height: 468 },
  {
    match: /^self-dev|^samorazv/,
    src: selfDevelopment,
    width: 720,
    height: 512,
  },
  { match: /islam/, src: islamic, width: 720, height: 486 },
  { match: /^kids|^child|^detsk|^balda/, src: kids, width: 720, height: 485 },
];

/** Категории из утверждённого макета. */
const DEFAULT_CATEGORIES = [
  'psychology',
  'self-development',
  'islamic-literature',
  'kids',
] as const;

function illustrationFor(slug: string) {
  return ILLUSTRATIONS.find(({ match }) => match.test(slug));
}

/** Плоский список: корневые категории и их подкатегории. */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
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
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] rounded-t-[3.5rem] border border-white/50 bg-gradient-to-b from-[#fcefe2] to-[#ebcfb4] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="relative grid aspect-[1/0.72] place-items-center overflow-hidden px-3 pt-4">
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
  const fromCatalog = flatten(categories)
    .filter(
      (category) =>
        category.booksCount + category.audiobooksCount > 0 || category.children.length > 0,
    )
    .slice(0, 4);
  // Пока в каталоге нет категорий с книгами — категории из макета (их создают в админке с теми же slug)
  const items: { id: string; slug: string; name: string; imageUrl: string | null }[] =
    fromCatalog.length > 0
      ? fromCatalog
      : DEFAULT_CATEGORIES.map((slug) => ({
          id: slug,
          slug,
          name: t(`defaults.${slug}`),
          imageUrl: null,
        }));

  const imageClass =
    'h-full w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-105';

  return (
    <section className="relative mt-6 overflow-x-clip lg:mt-2" aria-labelledby="categories-title">
      <LeafBranch className="pointer-events-none absolute top-24 -left-4 hidden h-44 w-32 lg:block" />
      <LeafBranch
        className="pointer-events-none absolute top-6 -right-4 hidden h-40 w-28 lg:block"
        flip
      />
      <Butterfly className="top-10 left-[38%] size-8" delay={1} />
      <Butterfly className="top-0 right-[22%] size-7" delay={3} />
      <div className="container-page">
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
                      loading="eager"
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
              <Image
                src={audiobooks}
                alt=""
                width={720}
                height={607}
                sizes="(min-width: 1024px) 16vw, 45vw"
                loading="eager"
                className={imageClass}
              />
            </CategoryCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
