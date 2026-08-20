'use client';

import { Fragment, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { FilterBar } from '../../../_components/admin/FilterBar';
import { PageHeader } from '../../../_components/admin/PageHeader';
import { Button, Input, EmptyState, Skeleton } from '@salonomia/ui';

interface AuditLogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  salonId: string | null;
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

export default function SuperadminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load(p: number) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(p), pageSize: '50' });
    if (actionFilter) params.set('action', actionFilter);
    if (targetTypeFilter) params.set('targetType', targetTypeFilter);
    apiFetch<AuditLogResponse>(`/superadmin/reports/audit-logs?${params}`)
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load(page);
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <main className="dashboard-page">
      <PageHeader
        title="Platform audit jurnalı"
        description={data ? `${data.total} hadisə` : undefined}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
      >
        <FilterBar
          search={
            <Input
              type="search"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Əməliyyat üzrə filtr"
              aria-label="Əməliyyat üzrə filtr"
            />
          }
          trailing={
            <Button type="submit" variant="secondary" loading={loading}>
              Axtar
            </Button>
          }
        >
          <Input
            type="search"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            placeholder="Obyekt tipi (məs. Reservation)"
            aria-label="Obyekt tipi"
            className="sm:max-w-60"
          />
        </FilterBar>
      </form>

      {error ? (
        <div className="admin-card admin-card-body text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-[var(--radius-sm)]" />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          {data.items.length === 0 ? (
            <EmptyState
              title="Hadisə tapılmadı"
              description="Filtr parametrlərini dəyişib yenidən yoxlayın."
            />
          ) : (
            <div
              className="data-table"
              style={{
                overflowX: 'auto',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Vaxt</th>
                    <th scope="col">Əməliyyat</th>
                    <th scope="col">Obyekt</th>
                    <th scope="col">İcraçı</th>
                    <th scope="col">Salon</th>
                    <th scope="col">
                      <span className="sr-only">Metadata</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <Fragment key={log.id}>
                      <tr>
                        <td className="whitespace-nowrap text-xs text-text-secondary">
                          {new Intl.DateTimeFormat(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                          }).format(new Date(log.createdAt))}
                        </td>
                        <td>
                          <code className="admin-chip admin-chip-accent font-mono">
                            {log.action}
                          </code>
                        </td>
                        <td className="text-text-secondary">
                          {log.targetType}{' '}
                          <code className="font-mono text-xs">{log.targetId.slice(0, 8)}…</code>
                        </td>
                        <td>
                          {log.actor ? (
                            <span title={log.actor.email}>{log.actor.fullName}</span>
                          ) : (
                            <span className="text-text-secondary">Sistem</span>
                          )}
                        </td>
                        <td className="text-xs text-text-secondary">
                          {log.salonId ? log.salonId.slice(0, 8) + '…' : '—'}
                        </td>
                        <td>
                          {log.metadata ? (
                            <button
                              type="button"
                              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                              aria-expanded={expanded === log.id}
                              className="rounded-[var(--radius-xs)] px-2 py-1 text-xs font-semibold text-accent hover:bg-surface-subtle"
                            >
                              {expanded === log.id ? 'gizlət' : 'metadata'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded === log.id && log.metadata ? (
                        <tr>
                          <td colSpan={6} style={{ background: 'var(--color-surface)' }}>
                            <pre className="overflow-x-auto text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Səhifələmə" className="flex items-center justify-between gap-4">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Əvvəlki
              </Button>
              <p className="text-sm text-text-secondary" aria-live="polite">
                Səhifə {page} / {totalPages} · {data.total} hadisə
              </p>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Növbəti →
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
