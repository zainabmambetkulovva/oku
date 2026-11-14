'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { authFetch, refreshSession, useAuth } from '@/lib/auth';
import { Button } from '../ui/button';

/**
 * Форма отзыва. Гостю — ссылка на вход с возвратом на эту страницу.
 * Отзыв публикуется сразу (правило магазина), один на товар.
 */
export function ReviewForm({ kind, slug }: { kind: 'books' | 'audiobooks'; slug: string }) {
  const t = useTranslations('reviewsBlock');
  const status = useAuth((state) => state.status);
  const pathname = usePathname();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'already' | 'invalid'>(
    'idle',
  );

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  if (status === 'unknown') return null;
  if (status === 'guest') {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="inline-block text-sm font-semibold text-cocoa underline"
      >
        {t('signIn')}
      </Link>
    );
  }
  if (state === 'done')
    return (
      <p role="status" className="rounded-2xl bg-[#e3ecd5] px-4 py-3 text-sm text-[#3f5a24]">
        {t('published')}
      </p>
    );

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!rating) return setState('invalid');
        setState('sending');
        try {
          await authFetch(`/${kind}/${slug}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ rating, text: text.trim() || undefined }),
          });
          setState('done');
          router.refresh();
        } catch (caught) {
          setState(
            caught instanceof ApiRequestError && caught.status === 409 ? 'already' : 'error',
          );
        }
      }}
      className="card space-y-4 p-5"
    >
      <h3 className="font-sans text-sm font-semibold text-ink">{t('write')}</h3>
      <fieldset>
        <legend className="text-sm text-ink/75">{t('yourRating')}</legend>
        <div className="mt-1 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={t('star', { count: value })}
              aria-pressed={rating === value}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className={`text-3xl transition hover:scale-110 ${(hover || rating) >= value ? 'text-gold' : 'text-sand'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm text-ink/75">
        {t('text')}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={t('textPlaceholder')}
          className="mt-1.5 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      {state === 'invalid' && <p className="text-xs text-[#a3412c]">{t('ratingRequired')}</p>}
      {state === 'already' && (
        <p role="alert" className="text-sm text-cocoa">
          {t('already')}
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-[#8a3524]">
          {t('error')}
        </p>
      )}
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
