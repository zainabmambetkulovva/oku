'use client';

import { useTranslations } from 'next-intl';
import { useHydrated } from '@/lib/use-hydrated';
import { useFavorites } from '@/store/favorites';
import type { ProductType } from '@/store/cart';
import { HeartIcon } from '../ui/icons';

export function FavoriteButton({
  type,
  id,
  className = '',
}: {
  type: ProductType;
  id: string;
  className?: string;
}) {
  const t = useTranslations('product');
  const hydrated = useHydrated();
  const active = useFavorites((state) => state.keys.includes(`${type}:${id}`)) && hydrated;
  const toggle = useFavorites((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(type, id)}
      aria-pressed={active}
      aria-label={active ? t('removeFromFavorites') : t('addToFavorites')}
      className={`grid size-9 place-items-center rounded-full bg-milk/90 text-forest shadow-sm transition hover:scale-105 hover:text-[#b4442e] ${active ? 'text-[#b4442e]' : ''} ${className}`}
    >
      <HeartIcon filled={active} className="size-[1.15rem]" />
    </button>
  );
}
