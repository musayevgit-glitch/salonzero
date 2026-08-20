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
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { FilterBar } from '../../../../_components/admin/FilterBar';
import { PageHeader } from '../../../../_components/admin/PageHeader';

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
  const t = useTranslations('salonAdmin');
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
    return <ErrorState title={t('customers.errorLoad')} description={state.message} />;
  }

  const data = state.kind === 'ready' ? state.data : null;
  const pageCount = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <main className="dashboard-page">
      <PageHeader
        title={t('customers.title')}
        description={data ? `${data.total} ${t('customers.title').toLocaleLowerCase()}` : undefined}
      />

      <FilterBar
        search={
          <Input
            type="search"
            placeholder={t('customers.searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t('customers.searchPlaceholder')}
          />
        }
      />

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
          title={search ? t('customers.noCustomersFound') : t('customers.noCustomers')}
          description={
            search ? t('customers.noCustomersFoundDesc') : t('customers.noCustomersDesc')
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
                header: t('customers.customer'),
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
                header: t('customers.email'),
                render: (c) => <span className="text-text-secondary">{c.email}</span>,
              },
              {
                key: 'visits',
                header: t('customers.totalVisits'),
                render: (c) => (
                  <Badge tone={c.totalVisits > 0 ? 'success' : 'neutral'}>{c.totalVisits}</Badge>
                ),
              },
              {
                key: 'lastVisit',
                header: t('customers.lastVisit'),
                render: (c) => (
                  <span className="text-text-secondary">{formatDate(c.lastVisit)}</span>
                ),
              },
              {
                key: 'nextBooking',
                header: t('customers.nextBooking'),
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
              `${c.email} · ${c.totalVisits} ${t('customers.visits').toLowerCase()}${c.nextBooking ? ` · ${formatDate(c.nextBooking)}` : ''}`
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
    </main>
  );
}
