'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { inputClass, ListState, PageHeader, Pager, useDebounced } from '@/components/admin/ui';
import { adminApi } from '@/lib/admin-api';

/** Журнал действий администраторов (кто, что, когда, было/стало). */
export default function AdminAuditPage() {
  const t = useTranslations('admin.auditAdmin');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(action.trim());
  const logs = useQuery({
    queryKey: ['admin', 'audit', query, page],
    queryFn: () => adminApi.auditLogs({ page, action: query || undefined }),
  });
  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Bishkek',
  });

  return (
    <>
      <PageHeader title={t('title')} />
      <input
        type="search"
        value={action}
        onChange={(e) => {
          setAction(e.target.value);
          setPage(1);
        }}
        placeholder={t('action')}
        aria-label={t('action')}
        className={`${inputClass} mt-0 mb-4 sm:max-w-sm`}
      />
      <ListState error={logs.isError} loading={logs.isLoading} />
      {logs.data &&
        (logs.data.data.length === 0 ? (
          <p className="card p-10 text-center text-sm text-muted">{t('empty')}</p>
        ) : (
          <>
            <ul className="space-y-2" data-testid="audit-log">
              {logs.data.data.map((entry) => (
                <li key={entry.id} className="card p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-cocoa-100 px-2 py-0.5 text-xs text-cocoa">
                      {entry.action}
                    </code>
                    <span className="text-xs text-muted">
                      {date.format(new Date(entry.createdAt))}
                    </span>
                    <span className="text-xs">
                      {entry.user ? t('by', { email: entry.user.email }) : '—'}
                    </span>
                    <span className="text-xs text-muted">
                      {entry.entityType} · {entry.entityId.slice(0, 8)}
                    </span>
                  </div>
                  {(entry.oldData != null || entry.newData != null) && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-cocoa">{t('details')}</summary>
                      <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-white/70 p-2 whitespace-pre-wrap">
                        {JSON.stringify({ old: entry.oldData, new: entry.newData }, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={logs.data.meta.totalPages} onChange={setPage} />
          </>
        ))}
    </>
  );
}
