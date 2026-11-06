import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { COVER_PALETTE } from '@/lib/cover-palette';
import type { CategoryNode } from '@/lib/types';
import { HornMotif } from '../ornaments/ornaments';
import { ArrowRight } from '../ui/button';
import { SectionTitle } from '../ui/section-title';

/** Плоский список: корневые категории и их подкатегории, у которых есть товары. */
function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

export async function CategoriesSection({ categories }: { categories: CategoryNode[] }) {
  const t = await getTranslations('categories');
  const ts = await getTranslations('sections');
  const items = flatten(categories)
    .filter(
      (category) =>
        category.booksCount + category.audiobooksCount > 0 || category.children.length > 0,
    )
    .slice(0, 5);

  if (items.length === 0) return null;
  return (
    <section className="container-page mt-16" aria-labelledby="genres-title">
      <SectionTitle id="genres-title">{ts('genres')}</SectionTitle>
      <ul className="scroll-row sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
        {items.map((category, index) => {
          const colors = COVER_PALETTE[index % COVER_PALETTE.length];
          return (
            <li key={category.id} className="w-[44%] shrink-0 snap-start sm:w-auto">
              <Link
                href={`/books?category=${category.slug}`}
                className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-card-hover)]"
                aria-label={`${t('open')}: ${category.name}`}
              >
                <div
                  className="relative grid aspect-[4/3] place-items-center overflow-hidden"
                  style={{ background: colors.background, color: colors.accent }}
                >
                  {category.imageUrl ? (
                    // Изображение категории загружается в админке
                    <img
                      src={category.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <HornMotif className="w-1/3 transition-transform duration-500 group-hover:scale-110" />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between gap-2 p-4">
                  <div>
                    <h3 className="font-sans text-sm leading-snug font-semibold text-ink">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {t('books', { count: category.booksCount + category.audiobooksCount })}
                    </p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/70 text-gold-dark transition group-hover:bg-forest group-hover:text-milk">
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
