'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inputClass, ListState, PageHeader, Pager, useDebounced } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminApi } from '@/lib/admin-api';

/** Пользователи: поиск, фильтр по роли и статусу. */
export default function AdminUsersPage() {
  const t = useTranslations('admin.usersAdmin');
  const tf = useTranslations('admin.filters');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(search.trim());
  const users = useQuery({
    queryKey: ['admin', 'users', query, role, status, page],
    queryFn: () =>
      adminApi.users({
        page,
        search: query || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
  });

  return (
    <>
      <PageHeader title={t('title')} />
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
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          aria-label={t('role')}
          className={`${inputClass} mt-0 sm:w-48`}
        >
          <option value="">
            {t('role')}: {tf('all')}
          </option>
          <option value="USER">{t('roles.USER')}</option>
          <option value="ADMIN">{t('roles.ADMIN')}</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label={t('status')}
          className={`${inputClass} mt-0 sm:w-48`}
        >
          <option value="">
            {t('status')}: {tf('all')}
          </option>
          {(['ACTIVE', 'INACTIVE', 'BANNED'] as const).map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <ListState error={users.isError} loading={users.isLoading} />
      {users.data &&
        (users.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <ul className="space-y-3" data-testid="admin-users">
              {users.data.data.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="card lift flex flex-wrap items-center gap-3 p-4 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{user.email}</span>
                      <span className="text-xs text-muted">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ')}{' '}
                        {user.phone && `· ${user.phone}`}
                      </span>
                    </span>
                    <span className="text-xs text-ink/70">
                      {t('orders', { count: user.ordersCount })}
                    </span>
                    {user.role === 'ADMIN' && (
                      <span className="rounded-full bg-cocoa px-2 py-0.5 text-xs text-milk">
                        {t('roles.ADMIN')}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${user.status === 'ACTIVE' ? 'bg-[#e3ecd5] text-[#3f5a24]' : 'bg-[#a3412c]/15 text-[#8a3524]'}`}
                    >
                      {t(`statuses.${user.status}`)}
                    </span>
                    {user.isLocked && (
                      <span className="rounded-full bg-[#f6e3c3] px-2 py-0.5 text-xs text-[#7a4a12]">
                        {t('locked')}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={users.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
