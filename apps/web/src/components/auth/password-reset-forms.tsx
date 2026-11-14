'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { requestPasswordReset, resetPassword, verifyEmail } from '@/lib/auth';
import { Button, buttonClasses } from '../ui/button';
import { FormAlert } from './auth-card';
import { PasswordInput, textInputClass } from './password-input';
import { strongPassword } from './register-form';

/** Запрос ссылки для нового пароля. Ответ одинаковый для любого адреса. */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tf = useTranslations('auth.forgotPage');
  const locale = useLocale() as 'ru' | 'ky';
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().trim().email() })),
  });

  if (sentTo) {
    return (
      <div className="mt-8 space-y-5">
        <FormAlert tone="success">{tf('sent', { email: sentTo })}</FormAlert>
        <Link href="/login" className={buttonClasses('outline', 'w-full')}>
          {tf('back')}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(async ({ email }) => {
        setError(null);
        try {
          await requestPasswordReset(email, locale);
          setSentTo(email);
        } catch (caught) {
          const status = caught instanceof ApiRequestError ? caught.status : 0;
          setError(status === 429 ? t('locked') : t('error'));
        }
      })}
    >
      <label className="block text-sm font-medium text-ink/85">
        {t('email')}
        <input
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(formState.errors.email)}
          {...register('email')}
          className={textInputClass}
        />
        {formState.errors.email && (
          <span className="mt-1 block text-xs text-[#a3412c]">{t('emailInvalid')}</span>
        )}
      </label>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        {formState.isSubmitting ? tf('submitting') : tf('submit')}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-cocoa underline">
          {tf('back')}
        </Link>
      </p>
    </form>
  );
}

const resetSchema = z
  .object({ password: strongPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, { path: ['confirm'] });

/** Новый пароль по ссылке из письма. */
export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const tr = useTranslations('auth.resetPage');
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'form' | 'done' | 'invalid' | 'error'>(
    token ? 'form' : 'invalid',
  );
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
  });

  if (state === 'done') {
    return (
      <div className="mt-8 space-y-5">
        <FormAlert tone="success">{tr('done')}</FormAlert>
        <Link href="/login" className={buttonClasses('primary', 'w-full')}>
          {t('toLogin')}
        </Link>
      </div>
    );
  }
  if (state === 'invalid') {
    return (
      <div className="mt-8 space-y-5">
        <FormAlert>{tr('invalid')}</FormAlert>
        <Link href="/forgot-password" className={buttonClasses('outline', 'w-full')}>
          {tr('requestNew')}
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(async ({ password }) => {
        try {
          await resetPassword(token, password);
          setState('done');
        } catch (caught) {
          setState(
            caught instanceof ApiRequestError && caught.status === 400 ? 'invalid' : 'error',
          );
        }
      })}
    >
      <div>
        <label htmlFor="new-password" className="text-sm font-medium text-ink/85">
          {tr('password')}
        </label>
        <PasswordInput id="new-password" autoComplete="new-password" {...register('password')} />
        <span className="mt-1 block text-xs text-muted">{t('register.passwordHint')}</span>
        {formState.errors.password && (
          <span className="mt-1 block text-xs text-[#a3412c]">{t('register.passwordWeak')}</span>
        )}
      </div>
      <div>
        <label htmlFor="confirm-password" className="text-sm font-medium text-ink/85">
          {tr('confirm')}
        </label>
        <PasswordInput id="confirm-password" autoComplete="new-password" {...register('confirm')} />
        {formState.errors.confirm && (
          <span className="mt-1 block text-xs text-[#a3412c]">{tr('mismatch')}</span>
        )}
      </div>
      {state === 'error' && <FormAlert>{t('error')}</FormAlert>}
      <Button type="submit" disabled={formState.isSubmitting} className="w-full">
        {formState.isSubmitting ? tr('submitting') : tr('submit')}
      </Button>
    </form>
  );
}

/** Подтверждение почты: страница сама отправляет токен из ссылки. */
export function VerifyEmail() {
  const tv = useTranslations('auth.verifyPage');
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'checking' | 'done' | 'invalid'>(
    token ? 'checking' : 'invalid',
  );
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token)
      .then(() => setState('done'))
      .catch(() => setState('invalid'));
  }, [token]);

  return (
    <div className="mt-8 space-y-5" data-testid="verify-email">
      {state === 'checking' && <FormAlert tone="info">{tv('checking')}</FormAlert>}
      {state === 'done' && <FormAlert tone="success">{tv('done')}</FormAlert>}
      {state === 'invalid' && <FormAlert>{tv('invalid')}</FormAlert>}
      {state !== 'checking' && (
        <Link href="/books" className={buttonClasses('primary', 'w-full')}>
          {tv('toShop')}
        </Link>
      )}
    </div>
  );
}
