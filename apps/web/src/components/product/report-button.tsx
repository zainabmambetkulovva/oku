'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { authFetch, useAuth } from '@/lib/auth';

/** «Пожаловаться» на отзыв: отзыв остаётся, решение принимает модератор. */
export function ReportButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations('report');
  const pathname = usePathname();
  const status = useAuth((state) => state.status);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (state === 'sent') {
    return (
      <p role="status" className="mt-2 text-xs text-[#3f5a24]">
        {t('sent')}
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-muted underline-offset-2 hover:text-[#8a3524] hover:underline"
      >
        {t('button')}
      </button>
    );
  }
  if (status !== 'authenticated') {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="mt-2 inline-block text-xs font-semibold text-cocoa underline"
      >
        {t('signIn')}
      </Link>
    );
  }
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setState('sending');
        try {
          await authFetch(`/reviews/${reviewId}/report`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason.trim() || undefined }),
          });
          setState('sent');
        } catch {
          setState('error');
        }
      }}
    >
      <label className="block text-xs text-ink/75">
        {t('reason')}
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded-xl border border-sand bg-white/80 px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </label>
      {state === 'error' && <p className="text-xs text-[#8a3524]">{t('error')}</p>}
      <div className="flex gap-3 text-xs font-semibold">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-full bg-cocoa px-4 py-1.5 text-milk"
        >
          {t('send')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-muted underline">
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
