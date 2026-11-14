import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { CategorySummary, Rating } from '@/lib/types';

/** Хлебные крошки «Каталог / Название». */
export async function Breadcrumbs({ href, title }: { href: string; title: string }) {
  const t = await getTranslations('productPage');
  return (
    <nav aria-label="breadcrumbs" className="text-sm text-muted">
      <Link href={href} className="hover:text-cocoa">
        ← {t('back')}
      </Link>
      <span className="mx-2">/</span>
      <span className="text-ink/80">{title}</span>
    </nav>
  );
}

/** Средняя оценка со ссылкой на блок отзывов. */
export async function RatingLine({ rating }: { rating: Rating }) {
  const t = await getTranslations('reviewsBlock');
  if (!rating.count || rating.average === null) {
    return (
      <a href="#reviews" className="text-sm text-muted hover:text-cocoa">
        {t('none')}
      </a>
    );
  }
  const full = Math.round(rating.average);
  return (
    <a
      href="#reviews"
      className="inline-flex items-center gap-2 text-sm text-ink/75 hover:text-cocoa"
      data-testid="rating"
    >
      <span className="tracking-[0.12em] text-gold" aria-hidden="true">
        {'★'.repeat(full)}
        <span className="text-sand">{'★'.repeat(5 - full)}</span>
      </span>
      {rating.average.toFixed(1)} · {t('count', { count: rating.count })}
    </a>
  );
}

export function CategoryChips({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/books?category=${category.slug}`}
            className="rounded-full border border-sand bg-white/60 px-3 py-1 text-xs font-semibold text-cocoa hover:bg-white"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SpecsTable({ rows, title }: { rows: [string, React.ReactNode][]; title: string }) {
  const filled = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (filled.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>
      <dl className="mt-3 divide-y divide-sand/60 text-sm" data-testid="specs">
        {filled.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
