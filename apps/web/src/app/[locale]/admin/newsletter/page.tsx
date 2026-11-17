'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  inputClass,
  ListState,
  Notice,
  PageHeader,
  Pager,
  useDebounced,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { adminApi, downloadSubscribersCsv } from '@/lib/admin-api';

/** Подписчики рассылки и экспорт в CSV (массовая рассылка отложена). */
export default function AdminNewsletterPage() {
  const t = useTranslations('admin.newsletterAdmin');
  const tc = useTranslations('admin.common');
  const tf = useTranslations('admin.filters');
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const query = useDebounced(search.trim());
  const subscribers = useQuery({
    queryKey: ['admin', 'subscribers', status, query, page],
    queryFn: () =>
      adminApi.subscribers({ page, status: status || undefined, search: query || undefined }),
  });
  const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeZone: 'Asia/Bishkek' });

  return (
    <>
      <PageHeader
        title={t('title')}
        action={
          <Button onClick={() => downloadSubscribersCsv().catch(() => setError(true))}>
            {t('export')}
          </Button>
        }
      />
      <p className="mb-4 text-sm text-ink/70">{t('note')}</p>
      {error && <Notice tone="error">{tc('error')}</Notice>}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('search')}
          aria-label={t('search')}
          className={`${inputClass} mt-0 sm:max-w-sm`}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label={tf('all')}
          className={`${inputClass} mt-0 sm:w-56`}
        >
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
          <option value="">{tf('all')}</option>
        </select>
      </div>
      <ListState error={subscribers.isError} loading={subscribers.isLoading} />
      {subscribers.data &&
        (subscribers.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">{subscribers.data.meta.total}</p>
            <ul className="card divide-y divide-sand/60 text-sm" data-testid="subscribers">
              {subscribers.data.data.map((subscriber) => (
                <li
                  key={subscriber.id}
                  className="flex flex-wrap justify-between gap-2 px-4 py-2.5"
                >
                  <span className="font-medium">{subscriber.email}</span>
                  <span className="text-xs text-muted">
                    {t('since', { date: date.format(new Date(subscriber.subscribedAt)) })}
                    {subscriber.unsubscribedAt &&
                      ` · ${t('unsubscribed', { date: date.format(new Date(subscriber.unsubscribedAt)) })}`}
                  </span>
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={subscribers.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
