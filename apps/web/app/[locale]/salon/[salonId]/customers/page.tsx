'use client';

import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  Skeleton,
  Table,
} from '@salonomia/ui';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  totalVisits: number;
  lastVisit: string | null;
  nextBooking: string | null;
}

interface CustomerListResponse {
  items: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: CustomerListResponse };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function CustomersPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function load(p: number, q: string) {
    if (state.kind !== 'ready') setState({ kind: 'loading' });
    const qs = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (q) qs.set('search', q);
    apiFetch<CustomerListResponse>(`/salons/${salonId}/customers?${qs}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/customers`);
          return;
        }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }

  useEffect(() => {
    load(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1, val);
    }, 350);
  }

  if (state.kind === 'permission-denied') return <PermissionDeniedState />;
  if (state.kind === 'error') {
    return <ErrorState title="Failed to load customers" description={state.message} />;
  }

  const data = state.kind === 'ready' ? state.data : null;
  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Customers</h1>
        {data ? (
          <p className="mt-1 text-sm text-text-secondary">
            {data.total} customer{data.total !== 1 ? 's' : ''}
          </p>
        ) : null}
      </div>

      {/* Search */}
      <div className="max-w-xs">
        <Input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search customers"
        />
      </div>

      {/* Loading */}
      {state.kind === 'loading' ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : null}

      {/* Empty */}
      {data && data.items.length === 0 ? (
        <EmptyState
          title={search ? 'No customers found' : 'No customers yet'}
          description={
            search
              ? `No customers match "${search}". Try a different search.`
              : 'Customers appear here once they make a reservation.'
          }
        />
      ) : null}

      {/* Data */}
      {data && data.items.length > 0 ? (
        <>
          {/* Desktop table */}
          <Table<CustomerSummary>
            columns={[
              {
                key: 'name',
                header: 'Customer',
                render: (c) => (
                  <NextLink
                    href={`/salon/${salonId}/customers/${c.id}`}
                    style={{
                      fontWeight: 600,
                      color: 'var(--color-accent)',
                      textDecoration: 'none',
                    }}
                  >
                    {c.fullName}
                  </NextLink>
                ),
              },
              {
                key: 'email',
                header: 'Email',
                render: (c) => (
                  <span className="text-text-secondary">{c.email}</span>
                ),
              },
              {
                key: 'visits',
                header: 'Total visits',
                render: (c) => (
                  <Badge tone={c.totalVisits > 0 ? 'success' : 'neutral'}>
                    {c.totalVisits}
                  </Badge>
                ),
              },
              {
                key: 'lastVisit',
                header: 'Last visit',
                render: (c) => (
                  <span className="text-text-secondary">{formatDate(c.lastVisit)}</span>
                ),
              },
              {
                key: 'nextBooking',
                header: 'Next booking',
                render: (c) =>
                  c.nextBooking ? (
                    <span className="font-medium">{formatDate(c.nextBooking)}</span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  ),
              },
            ]}
            rows={data.items}
            getRowKey={(c) => c.id}
          />

          {/* Mobile list */}
          <MobileRecordList<CustomerSummary>
            rows={data.items}
            getRowKey={(c) => c.id}
            renderPrimary={(c) => (
              <NextLink
                href={`/salon/${salonId}/customers/${c.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {c.fullName}
              </NextLink>
            )}
            renderSecondary={(c) =>
              `${c.email} · ${c.totalVisits} visit${c.totalVisits !== 1 ? 's' : ''}${c.nextBooking ? ` · Next: ${formatDate(c.nextBooking)}` : ''}`
            }
          />

          {pageCount > 1 ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={(p) => {
                setPage(p);
                load(p, search);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
