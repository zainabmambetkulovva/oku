'use client';

import { useTranslations } from 'next-intl';
import { useHydrated } from '@/lib/use-hydrated';
import { type FavoriteItem, useFavorites } from '@/store/favorites';
import { HeartIcon } from '../ui/icons';

export function FavoriteButton({
  item,
  className = '',
}: {
  /** Данные товара — чтобы показать его на странице избранного */
  item: FavoriteItem;
  className?: string;
}) {
  const t = useTranslations('product');
  const hydrated = useHydrated();
  const active =
    useFavorites((state) => state.items.some((i) => i.type === item.type && i.id === item.id)) &&
    hydrated;
  const toggle = useFavorites((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={active}
      aria-label={active ? t('removeFromFavorites') : t('addToFavorites')}
      className={`grid size-8 place-items-center rounded-full text-cocoa-500 transition hover:scale-110 hover:text-[#b4442e] ${active ? 'text-[#b4442e]' : ''} ${className}`}
    >
      <HeartIcon filled={active} className="size-[1.15rem]" />
    </button>
  );
}
