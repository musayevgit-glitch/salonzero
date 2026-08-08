'use client';

import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  Link,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  Select,
  Skeleton,
  Table,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface ServiceListItem {
  id: string;
  categoryId: string | null;
  name: string;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
}

interface ServiceListResponse {
  items: ServiceListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: ServiceListResponse };

function formatPrice(priceAmount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    priceAmount / 100,
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const t = useTranslations('salonAdmin');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    apiFetch<ServiceCategory[]>(`/salons/${salonId}/service-categories`)
      .then(setCategories)
      .catch(() => undefined);
  }, [salonId]);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (activeFilter) query.set('isActive', activeFilter);
    if (categoryFilter) query.set('categoryId', categoryFilter);

    apiFetch<ServiceListResponse>(`/salons/${salonId}/services?${query.toString()}`)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/services`);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [salonId, search, activeFilter, categoryFilter, page, router]);

  if (state.kind === 'loading') {
    return (
      <main className="flex flex-col gap-4 p-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="p-8">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="p-8">
        <ErrorState title={t('services.errorLoad')} description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? (id ? '—' : t('services.uncategorized'));

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">{t('services.title')}</h1>
        <Link href={`/salon/${salonId}/services/new`}>+ {t('services.new')}</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder={t('services.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={activeFilter}
          onChange={(e) => {
            setPage(1);
            setActiveFilter(e.target.value as typeof activeFilter);
          }}
          className="sm:max-w-40"
        >
          <option value="">{t('services.allStatuses')}</option>
          <option value="true">{t('services.active')}</option>
          <option value="false">{t('services.inactive')}</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
          className="sm:max-w-48"
        >
          <option value="">{t('services.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState title={t('services.noServicesFound')} description={t('services.noServicesFoundDesc')} />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: t('services.name'),
                render: (row: ServiceListItem) => (
                  <Link href={`/salon/${salonId}/services/${row.id}`}>{row.name}</Link>
                ),
              },
              {
                key: 'categoryId',
                header: t('services.category'),
                render: (row: ServiceListItem) => categoryName(row.categoryId),
              },
              {
                key: 'priceAmount',
                header: t('services.price'),
                render: (row: ServiceListItem) => formatPrice(row.priceAmount, row.currency),
              },
              {
                key: 'durationMinutes',
                header: t('services.duration'),
                render: (row: ServiceListItem) => `${row.durationMinutes} ${t('common.minutes')}`,
              },
              {
                key: 'isActive',
                header: t('employees.status'),
                render: (row: ServiceListItem) => (
                  <Badge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('services.active') : t('services.inactive')}
                  </Badge>
                ),
              },
            ]}
            rows={items}
            getRowKey={(row) => row.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(row) => row.id}
            renderPrimary={(row) => (
              <Link href={`/salon/${salonId}/services/${row.id}`}>{row.name}</Link>
            )}
            renderSecondary={(row) =>
              `${formatPrice(row.priceAmount, row.currency)} · ${row.durationMinutes} ${t('common.minutes')}`
            }
            renderAction={(row) => (
              <Badge tone={row.isActive ? 'success' : 'neutral'}>
                {row.isActive ? t('services.active') : t('services.inactive')}
              </Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
