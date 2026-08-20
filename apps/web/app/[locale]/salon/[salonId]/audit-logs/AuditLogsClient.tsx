'use client';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  MobileRecordList,
  Pagination,
  Skeleton,
  Table,
} from '@salonomia/ui';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { FilterBar } from '../../../../_components/admin/FilterBar';
import { PageHeader } from '../../../../_components/admin/PageHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; email: string; fullName: string } | null;
}

interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SalonAuditLogsClient() {
  const { salonId } = useParams<{ salonId: string }>();
  const t = useTranslations('salonAdmin');
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [pendingFilter, setPendingFilter] = useState('');
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(p: number, action: string) {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(p), pageSize: '50' });
    if (action) qs.set('action', action);
    apiFetch<AuditLogResponse>(`/salons/${salonId}/reports/audit-logs?${qs}`)
      .then((r) => setData(r))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(page, actionFilter);
  }, [page, salonId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActionFilter(pendingFilter);
    setPage(1);
    load(1, pendingFilter);
  }

  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <main className="dashboard-page">
      <PageHeader
        title={t('auditLog.title')}
        description={data ? `${data.total} ${t('auditLog.events')}` : undefined}
      />

      <form onSubmit={handleSearch}>
        <FilterBar
          search={
            <Input
              type="search"
              value={pendingFilter}
              onChange={(e) => setPendingFilter(e.target.value)}
              placeholder={t('auditLog.filterPlaceholder')}
              aria-label={t('auditLog.filterPlaceholder')}
            />
          }
          trailing={
            <Button type="submit" variant="secondary" loading={loading}>
              {t('common.search')}
            </Button>
          }
        />
      </form>

      {error ? <ErrorState title={t('auditLog.errorLoad')} description={error} /> : null}

      {/* Skeleton */}
      {loading && !data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : null}

      {/* Results */}
      {data ? (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              title={t('auditLog.noEventsFound')}
              description={
                actionFilter
                  ? `No events match "${actionFilter}". Try a different filter.`
                  : t('auditLog.noEventsDesc')
              }
            />
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
                {/* Desktop table */}
                <Table<AuditLogItem>
                  columns={[
                    {
                      key: 'time',
                      header: t('auditLog.time'),
                      render: (log) => (
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDatetime(log.createdAt)}
                        </span>
                      ),
                    },
                    {
                      key: 'action',
                      header: t('auditLog.action'),
                      render: (log) => (
                        <code
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            background: 'var(--color-surface)',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--color-border)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.action}
                        </code>
                      ),
                    },
                    {
                      key: 'target',
                      header: t('auditLog.target'),
                      render: (log) => (
                        <span
                          style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}
                        >
                          {log.targetType}{' '}
                          <code style={{ fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                            {log.targetId.slice(0, 8)}…
                          </code>
                        </span>
                      ),
                    },
                    {
                      key: 'actor',
                      header: t('auditLog.actor'),
                      render: (log) =>
                        log.actor ? (
                          <span title={log.actor.email} style={{ fontSize: '0.875rem' }}>
                            {log.actor.fullName}
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}
                          >
                            {t('auditLog.system')}
                          </span>
                        ),
                    },
                  ]}
                  rows={data.items}
                  getRowKey={(log) => log.id}
                />

                {/* Mobile fallback */}
                <MobileRecordList<AuditLogItem>
                  rows={data.items}
                  getRowKey={(log) => log.id}
                  renderPrimary={(log) => (
                    <code style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {log.action}
                    </code>
                  )}
                  renderSecondary={(log) =>
                    `${formatDatetime(log.createdAt)} · ${log.actor?.fullName ?? t('auditLog.system')}`
                  }
                />
              </div>
            </Card>
          )}

          {pageCount > 1 ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={(p) => {
                setPage(p);
                load(p, actionFilter);
              }}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
