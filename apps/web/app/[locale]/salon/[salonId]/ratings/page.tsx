'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Button,
  EmptyState,
  ErrorState,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  Skeleton,
  Table,
} from '@salonomia/ui';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { PageHeader } from '../../../../_components/admin/PageHeader';
import { formatDateOnly } from '../../../../../lib/format-date';

const PAGE_SIZE = 20;

interface RatingRow {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  serviceName: string | null;
  stylistName: string | null;
  reservationStartAt: string;
}

interface RatingList {
  items: RatingRow[];
  total: number;
  avgRating: number | null;
  ratingCount: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: RatingList };

/** Renders the score as filled/empty stars plus the number, so it is not colour-only. */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true" className="text-amber-500">
        {'★'.repeat(value)}
        <span className="text-border">{'★'.repeat(5 - value)}</span>
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </span>
  );
}

/**
 * Ratings customers left for this salon.
 *
 * Reads /salons/:salonId/ratings, which re-establishes the caller's salon authorization
 * server-side and filters every row by that salon — the id in the URL here is only a route
 * parameter, never the thing that grants access.
 */
export default function SalonRatingsPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const t = useTranslations('salonAdmin.ratings');
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [stars, setStars] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (stars !== null) query.set('stars', String(stars));
      const data = await apiFetch<RatingList>(`/salons/${salonId}/ratings?${query.toString()}`);
      setState({ kind: 'ready', data });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState({ kind: 'permission-denied' });
        return;
      }
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : t('loadError') });
    }
  }, [salonId, page, stars, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary =
    state.kind === 'ready' && state.data.avgRating !== null && state.data.ratingCount > 0
      ? `${t('average')}: ${state.data.avgRating.toFixed(1)} · ${t('total')}: ${state.data.ratingCount}`
      : t('subtitle');

  const columns = [
    { key: 'stars', header: t('colStars'), render: (r: RatingRow) => <Stars value={r.stars} /> },
    { key: 'customer', header: t('colCustomer'), render: (r: RatingRow) => r.customerName },
    {
      key: 'service',
      header: t('colService'),
      render: (r: RatingRow) => r.serviceName ?? t('noComment'),
    },
    {
      key: 'stylist',
      header: t('colStylist'),
      render: (r: RatingRow) => r.stylistName ?? t('noComment'),
    },
    {
      key: 'visit',
      header: t('colVisitDate'),
      render: (r: RatingRow) => formatDateOnly(r.reservationStartAt, locale),
    },
    {
      key: 'ratedAt',
      header: t('colRatedAt'),
      render: (r: RatingRow) => formatDateOnly(r.createdAt, locale),
    },
    {
      key: 'comment',
      header: t('colComment'),
      render: (r: RatingRow) => (
        <span className="block max-w-xs whitespace-normal break-words">
          {r.comment ?? t('noComment')}
        </span>
      ),
    },
  ];

  const totalPages = state.kind === 'ready' ? Math.ceil(state.data.total / PAGE_SIZE) : 1;

  return (
    <div className="dashboard-page">
      <PageHeader title={t('title')} description={summary} />

      {/* Filter bar stays mounted across loads so the active filter never flickers away. */}
      <div role="group" aria-label={t('colStars')} className="flex flex-wrap gap-2">
        <Button
          variant={stars === null ? 'primary' : 'secondary'}
          aria-pressed={stars === null}
          onClick={() => {
            setPage(1);
            setStars(null);
          }}
        >
          {t('filterAll')}
        </Button>
        {[5, 4, 3, 2, 1].map((n) => (
          <Button
            key={n}
            variant={stars === n ? 'primary' : 'secondary'}
            aria-pressed={stars === n}
            onClick={() => {
              setPage(1);
              setStars(n);
            }}
          >
            {t('filterStars', { count: n })}
          </Button>
        ))}
      </div>

      {state.kind === 'loading' ? (
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
      ) : state.kind === 'permission-denied' ? (
        <PermissionDeniedState />
      ) : state.kind === 'error' ? (
        <ErrorState title={t('loadError')} description={state.message} />
      ) : state.data.items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyDesc')} />
      ) : (
        <>
          <Table columns={columns} rows={state.data.items} getRowKey={(r) => r.id} />
          <MobileRecordList
            rows={state.data.items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => (
              <span className="flex items-center gap-2">
                <Stars value={r.stars} />
                <span className="truncate">{r.customerName}</span>
              </span>
            )}
            renderSecondary={(r) =>
              [r.serviceName, r.stylistName, formatDateOnly(r.reservationStartAt, locale)]
                .filter(Boolean)
                .join(' · ')
            }
          />
          <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
