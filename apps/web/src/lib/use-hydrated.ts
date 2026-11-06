'use client';

import { useEffect, useState } from 'react';

/**
 * true после гидратации. Данные из localStorage (корзина, избранное) показываются
 * только после неё — иначе HTML сервера и браузера не совпадут.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
