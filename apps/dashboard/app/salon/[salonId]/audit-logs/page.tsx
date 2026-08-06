'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

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

export default function SalonAuditLogsPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load(p: number) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(p), pageSize: '50' });
    if (actionFilter) params.set('action', actionFilter);
    apiFetch<AuditLogResponse>(`/salons/${salonId}/reports/audit-logs?${params}`)
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action (e.g. reservation.created)"
          className="flex-1 rounded border border-input bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Search
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Target</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No audit events found.
                    </td>
                  </tr>
                )}
                {data.items.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(log.createdAt))}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {log.targetType}{' '}
                      <span className="font-mono text-xs">{log.targetId.slice(0, 8)}…</span>
                    </td>
                    <td className="px-3 py-2">
                      {log.actor ? (
                        <span title={log.actor.email}>{log.actor.fullName}</span>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-primary underline disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-muted-foreground">
                Page {page} of {totalPages} · {data.total} events
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-primary underline disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
