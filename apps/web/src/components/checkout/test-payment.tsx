'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authFetch, refreshSession, useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { FormAlert } from '../auth/auth-card';
import { Button } from '../ui/button';

/**
 * Страница тестового провайдера (только разработка и автотесты). Результат
 * проходит тем же путём, что и настоящий: API обрабатывает событие платежа.
 * В production тестовый провайдер запрещён, а API отвечает 403.
 */
export function TestPayment() {
  const t = useTranslations('testPayment');
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get('paymentId') ?? '';
  const orderNumber = params.get('order') ?? '';
  const amount = Number(params.get('amount') ?? 0);
  const status = useAuth((state) => state.status);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (status === 'unknown') void refreshSession();
  }, [status]);

  const send = async (result: 'SUCCEEDED' | 'FAILED') => {
    setBusy(true);
    try {
      await authFetch(`/payments/test/${encodeURIComponent(paymentId)}/simulate`, {
        method: 'POST',
        body: JSON.stringify({ status: result }),
      });
      router.replace(`/orders/${orderNumber}?payment=${paymentId}`);
    } catch {
      setUnavailable(true);
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-5" data-testid="test-payment">
      <FormAlert tone="info">{t('note')}</FormAlert>
      <p className="text-sm">{t('order', { number: orderNumber, amount: formatPrice(amount) })}</p>
      {unavailable && <FormAlert>{t('unavailable')}</FormAlert>}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => void send('SUCCEEDED')}
          disabled={busy || status !== 'authenticated'}
        >
          {t('succeed')}
        </Button>
        <Button
          variant="outline"
          onClick={() => void send('FAILED')}
          disabled={busy || status !== 'authenticated'}
        >
          {t('fail')}
        </Button>
      </div>
    </div>
  );
}
