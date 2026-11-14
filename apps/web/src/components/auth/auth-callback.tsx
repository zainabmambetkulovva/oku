'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { refreshSession, safeNext, useAuth } from '@/lib/auth';
import { buttonClasses } from '../ui/button';
import { FormAlert } from './auth-card';

/**
 * Возврат после входа через Google: API уже выдал cookie сессии,
 * здесь получаем access-токен и переходим туда, откуда пришёл покупатель.
 */
export function AuthCallback() {
  const t = useTranslations('auth');
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refreshSession().then((ok) => {
      if (!ok) return setFailed(true);
      const role = useAuth.getState().user?.role;
      router.replace(next ?? (role === 'ADMIN' ? '/admin' : '/'));
    });
  }, [next, router]);

  if (!failed) {
    return (
      <p role="status" className="mt-6 animate-pulse text-sm text-ink/70">
        {t('callback.title')}
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-5">
      <FormAlert>{t('callback.failed')}</FormAlert>
      <Link href="/login" className={buttonClasses('primary', 'w-full')}>
        {t('toLogin')}
      </Link>
    </div>
  );
}
