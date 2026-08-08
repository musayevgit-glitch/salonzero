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
import { apiFetch, ApiError } from '../../../../../lib/api-client';

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

export default function SalonAuditLogsPage() {
  const { salonId } = useParams<{ salonId: string }>();
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Audit log</h1>
        {data ? (
          <p className="mt-1 text-sm text-text-secondary">
            {data.total} event{data.total !== 1 ? 's' : ''}
          </p>
        ) : null}
      </div>

      {/* Filter */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          type="search"
          value={pendingFilter}
          onChange={(e) => setPendingFilter(e.target.value)}
          placeholder="Filter by action (e.g. reservation.created)"
          aria-label="Filter audit log by action"
        />
        <Button type="submit" variant="secondary" loading={loading}>
          Search
        </Button>
      </form>

      {error ? <ErrorState title="Failed to load audit log" description={error} /> : null}

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
              title="No audit events found"
              description={
                actionFilter
                  ? `No events match "${actionFilter}". Try a different filter.`
                  : 'No audit events have been recorded yet.'
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
                      header: 'Time',
                      render: (log) => (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {formatDatetime(log.createdAt)}
                        </span>
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
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
                      header: 'Target',
                      render: (log) => (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                          {log.targetType}{' '}
                          <code style={{ fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                            {log.targetId.slice(0, 8)}…
                          </code>
                        </span>
                      ),
                    },
                    {
                      key: 'actor',
                      header: 'Actor',
                      render: (log) =>
                        log.actor ? (
                          <span title={log.actor.email} style={{ fontSize: '0.875rem' }}>
                            {log.actor.fullName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            System
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
                    `${formatDatetime(log.createdAt)} · ${log.actor?.fullName ?? 'System'}`
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
    </div>
  );
}
