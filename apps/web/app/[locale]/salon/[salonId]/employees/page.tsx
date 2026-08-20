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
import { FilterBar } from '../../../../_components/admin/FilterBar';
import { LinkButton } from '../../../../_components/admin/LinkButton';
import { PageHeader } from '../../../../_components/admin/PageHeader';

interface EmployeeListItem {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: EmployeeListResponse };

export default function SalonEmployeesPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const t = useTranslations('salonAdmin');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (activeFilter) query.set('isActive', activeFilter);

    apiFetch<EmployeeListResponse>(`/salons/${salonId}/employees?${query.toString()}`)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/employees`);
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
  }, [salonId, search, activeFilter, page, router]);

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="dashboard-page">
        <ErrorState title={t('employees.errorLoad')} description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="dashboard-page">
      <PageHeader
        title={t('employees.title')}
        description={`${total} ${t('employees.title').toLocaleLowerCase()}`}
        actions={
          <LinkButton href={`/salon/${salonId}/employees/new`}>+ {t('employees.new')}</LinkButton>
        }
      />

      <FilterBar
        search={
          <Input
            placeholder={t('employees.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            aria-label={t('employees.searchPlaceholder')}
          />
        }
      >
        <Select
          value={activeFilter}
          onChange={(e) => {
            setPage(1);
            setActiveFilter(e.target.value as typeof activeFilter);
          }}
          aria-label={t('employees.allStatuses')}
          className="sm:max-w-44"
        >
          <option value="">{t('employees.allStatuses')}</option>
          <option value="true">{t('employees.active')}</option>
          <option value="false">{t('employees.inactive')}</option>
        </Select>
      </FilterBar>

      {items.length === 0 ? (
        <EmptyState
          title={t('employees.noEmployeesFound')}
          description={t('employees.noEmployeesFoundDesc')}
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'fullName',
                header: t('employees.name'),
                render: (row: EmployeeListItem) => (
                  <Link href={`/salon/${salonId}/employees/${row.id}`}>{row.fullName}</Link>
                ),
              },
              {
                key: 'bio',
                header: t('employees.bio'),
                render: (row: EmployeeListItem) => row.bio ?? '—',
              },
              {
                key: 'isActive',
                header: t('employees.status'),
                render: (row: EmployeeListItem) => (
                  <Badge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? t('employees.active') : t('employees.inactive')}
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
              <Link href={`/salon/${salonId}/employees/${row.id}`}>{row.fullName}</Link>
            )}
            renderSecondary={(row) => row.bio ?? ''}
            renderAction={(row) => (
              <Badge tone={row.isActive ? 'success' : 'neutral'}>
                {row.isActive ? t('employees.active') : t('employees.inactive')}
              </Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
