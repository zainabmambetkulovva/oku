'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { authFetch, refreshSession } from '@/lib/auth';
import type { SavedAddress } from '@/lib/types';
import { FormAlert } from '../auth/auth-card';
import { PasswordInput, textInputClass } from '../auth/password-input';
import { strongPassword } from '../auth/register-form';
import { Button } from '../ui/button';
import { SectionTitle } from './account-pages';
import { useAccountQuery, useInvalidateAccount } from './use-account';

const PHONE = /^\+?[0-9\s\-()]{7,20}$/;

interface Profile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locale: 'ru' | 'ky';
  hasPassword: boolean;
  googleLinked: boolean;
}

// ─── Профиль ─────────────────────────────────────────────────────────────────

export function ProfileForm() {
  const t = useTranslations('account.profile');
  const tc = useTranslations('account');
  const tl = useTranslations('catalog.languages');
  const invalidate = useInvalidateAccount();
  const { data, isLoading } = useAccountQuery<Profile>('profile', '/users/me');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', locale: 'ru' });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'phone'>('idle');

  useEffect(() => {
    if (data) {
      setForm({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        phone: data.phone ?? '',
        locale: data.locale,
      });
    }
  }, [data]);

  if (isLoading || !data)
    return <p className="animate-pulse text-sm text-muted">{tc('loading')}</p>;

  const field =
    (name: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setState('idle');
      setForm((current) => ({ ...current, [name]: event.target.value }));
    };

  return (
    <div className="space-y-10">
      <form
        noValidate
        className="card space-y-4 p-6"
        data-testid="profile-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const phone = form.phone.trim();
          if (phone && !PHONE.test(phone)) return setState('phone');
          setState('saving');
          try {
            await authFetch('/users/me', {
              method: 'PATCH',
              body: JSON.stringify({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: phone || null,
                locale: form.locale,
              }),
            });
            // Имя в шапке обновится вместе с сессией
            await refreshSession();
            void invalidate('profile');
            setState('saved');
          } catch {
            setState('error');
          }
        }}
      >
        <p className="text-sm text-ink/70">
          {t('email')}: <strong className="text-ink">{data.email}</strong>
          {data.googleLinked && (
            <span className="ml-2 text-xs text-[#3f5a24]">· {t('google')}</span>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink/85">
            {t('firstName')}
            <input
              value={form.firstName}
              onChange={field('firstName')}
              maxLength={100}
              className={textInputClass}
            />
          </label>
          <label className="block text-sm font-medium text-ink/85">
            {t('lastName')}
            <input
              value={form.lastName}
              onChange={field('lastName')}
              maxLength={100}
              className={textInputClass}
            />
          </label>
          <label className="block text-sm font-medium text-ink/85">
            {t('phone')}
            <input
              type="tel"
              value={form.phone}
              onChange={field('phone')}
              placeholder="+996"
              className={textInputClass}
            />
            {state === 'phone' && (
              <span className="mt-1 block text-xs text-[#a3412c]">{t('phoneInvalid')}</span>
            )}
          </label>
          <label className="block text-sm font-medium text-ink/85">
            {t('locale')}
            <select value={form.locale} onChange={field('locale')} className={textInputClass}>
              <option value="ky">{tl('ky')}</option>
              <option value="ru">{tl('ru')}</option>
            </select>
          </label>
        </div>
        {state === 'saved' && <FormAlert tone="success">{t('saved')}</FormAlert>}
        {state === 'error' && <FormAlert>{t('error')}</FormAlert>}
        <Button type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? t('saving') : t('save')}
        </Button>
      </form>

      <PasswordForm hasPassword={data.hasPassword} onDone={() => void invalidate('profile')} />
    </div>
  );
}

function PasswordForm({ hasPassword, onDone }: { hasPassword: boolean; onDone: () => void }) {
  const t = useTranslations('account.profile');
  const tr = useTranslations('auth.register');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [state, setState] = useState<
    'idle' | 'saving' | 'done' | 'weak' | 'wrong' | 'same' | 'error'
  >('idle');

  return (
    <section>
      <SectionTitle>{hasPassword ? t('passwordTitle') : t('setPasswordTitle')}</SectionTitle>
      <form
        noValidate
        className="card space-y-4 p-6"
        data-testid="password-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!strongPassword.safeParse(next).success) return setState('weak');
          setState('saving');
          try {
            await authFetch('/users/me/password', {
              method: 'POST',
              body: JSON.stringify({
                ...(hasPassword && { currentPassword: current }),
                newPassword: next,
              }),
            });
            setCurrent('');
            setNext('');
            setState('done');
            onDone();
          } catch (caught) {
            const message =
              caught instanceof ApiRequestError ? String(caught.body?.message ?? '') : '';
            setState(
              /differ/i.test(message) ? 'same' : /incorrect/i.test(message) ? 'wrong' : 'error',
            );
          }
        }}
      >
        {!hasPassword && <p className="text-sm text-ink/75">{t('setPasswordText')}</p>}
        {hasPassword && (
          <div>
            <label htmlFor="current-password" className="text-sm font-medium text-ink/85">
              {t('currentPassword')}
            </label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </div>
        )}
        <div>
          <label htmlFor="new-account-password" className="text-sm font-medium text-ink/85">
            {t('newPassword')}
          </label>
          <PasswordInput
            id="new-account-password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
          <span className="mt-1 block text-xs text-muted">{tr('passwordHint')}</span>
        </div>
        {state === 'weak' && <FormAlert>{tr('passwordWeak')}</FormAlert>}
        {state === 'wrong' && <FormAlert>{t('wrongPassword')}</FormAlert>}
        {state === 'same' && <FormAlert>{t('samePassword')}</FormAlert>}
        {state === 'error' && <FormAlert>{t('error')}</FormAlert>}
        {state === 'done' && (
          <FormAlert tone="success">
            {hasPassword ? t('passwordChanged') : t('passwordSet')}
          </FormAlert>
        )}
        <Button type="submit" disabled={state === 'saving'}>
          {hasPassword ? t('changePassword') : t('setPassword')}
        </Button>
      </form>
    </section>
  );
}

// ─── Адреса ──────────────────────────────────────────────────────────────────

type AddressDraft = Omit<SavedAddress, 'id' | 'isDefault' | 'apartment' | 'postalCode'> & {
  apartment: string;
  postalCode: string;
};

const EMPTY: AddressDraft = {
  title: '',
  recipientName: '',
  phone: '',
  country: 'Кыргызстан',
  city: '',
  street: '',
  building: '',
  apartment: '',
  postalCode: '',
};

function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: AddressDraft;
  onSave: (draft: AddressDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations('account.addresses');
  const tc = useTranslations('checkout');
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fields: [keyof AddressDraft, string, boolean][] = [
    ['title', t('label'), true],
    ['recipientName', t('recipient'), true],
    ['phone', tc('phone'), true],
    ['country', tc('country'), true],
    ['city', tc('city'), true],
    ['street', tc('street'), true],
    ['building', tc('building'), true],
    ['apartment', tc('apartment'), false],
    ['postalCode', tc('postalCode'), false],
  ];

  return (
    <form
      noValidate
      className="card space-y-4 p-6"
      data-testid="address-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const missing = fields.some(([name, , required]) => required && !draft[name].trim());
        if (missing || !PHONE.test(draft.phone.trim())) return setError(t('error'));
        setSaving(true);
        try {
          await onSave(draft);
        } catch (caught) {
          setError(
            caught instanceof ApiRequestError && /No more than/.test(String(caught.body?.message))
              ? t('limit')
              : t('error'),
          );
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, label]) => (
          <label key={name} className="block text-sm font-medium text-ink/85">
            {label}
            <input
              value={draft[name]}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [name]: event.target.value }))
              }
              type={name === 'phone' ? 'tel' : 'text'}
              className={textInputClass}
            />
          </label>
        ))}
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {t('save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}

export function AddressBook() {
  const t = useTranslations('account.addresses');
  const tc = useTranslations('account');
  const invalidate = useInvalidateAccount();
  const { data, isLoading } = useAccountQuery<SavedAddress[]>('addresses', '/users/me/addresses');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const reload = () => invalidate('addresses');

  if (isLoading || !data)
    return <p className="animate-pulse text-sm text-muted">{tc('loading')}</p>;

  const toBody = (draft: AddressDraft) => ({
    ...Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])),
    apartment: draft.apartment.trim() || undefined,
    postalCode: draft.postalCode.trim() || undefined,
  });

  return (
    <div className="space-y-4">
      {data.length === 0 && editing === null && (
        <p className="card p-6 text-sm text-ink/75">{t('empty')}</p>
      )}
      <ul className="space-y-3">
        {data.map((address) =>
          editing === address.id ? (
            <li key={address.id}>
              <AddressForm
                initial={{
                  ...address,
                  apartment: address.apartment ?? '',
                  postalCode: address.postalCode ?? '',
                }}
                onCancel={() => setEditing(null)}
                onSave={async (draft) => {
                  await authFetch(`/users/me/addresses/${address.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(toBody(draft)),
                  });
                  setEditing(null);
                  await reload();
                }}
              />
            </li>
          ) : (
            <li
              key={address.id}
              className="card flex flex-wrap items-start gap-4 p-5"
              data-testid="address"
            >
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-ink">
                  {address.title}
                  {address.isDefault && (
                    <span className="ml-2 rounded-full bg-cocoa-100 px-2 py-0.5 text-[0.65rem] text-cocoa">
                      {t('default')}
                    </span>
                  )}
                </p>
                <p className="text-ink/75">
                  {[
                    address.country,
                    address.city,
                    address.street,
                    address.building,
                    address.apartment,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-xs text-muted">
                  {address.recipientName} · {address.phone}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                {!address.isDefault && (
                  <button
                    type="button"
                    className="text-cocoa underline"
                    onClick={() =>
                      void authFetch(`/users/me/addresses/${address.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isDefault: true }),
                      }).then(reload)
                    }
                  >
                    {t('makeDefault')}
                  </button>
                )}
                <button
                  type="button"
                  className="text-cocoa underline"
                  onClick={() => setEditing(address.id)}
                >
                  {t('edit')}
                </button>
                <button
                  type="button"
                  className="text-[#8a3524] underline"
                  onClick={() =>
                    window.confirm(t('deleteConfirm')) &&
                    void authFetch(`/users/me/addresses/${address.id}`, { method: 'DELETE' }).then(
                      reload,
                    )
                  }
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === 'new' ? (
        <AddressForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSave={async (draft) => {
            await authFetch('/users/me/addresses', {
              method: 'POST',
              body: JSON.stringify(toBody(draft)),
            });
            setEditing(null);
            await reload();
          }}
        />
      ) : (
        <Button variant="outline" onClick={() => setEditing('new')}>
          {t('add')}
        </Button>
      )}
    </div>
  );
}
