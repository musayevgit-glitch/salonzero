'use client';

import {
  Badge,
  Button,
  ConfirmDialog,
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
  useToast,
} from '@salonomia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { FilterBar } from '../../../_components/admin/FilterBar';
import { LinkButton } from '../../../_components/admin/LinkButton';
import { PageHeader } from '../../../_components/admin/PageHeader';

interface Salon {
  id: string;
  name: string;
}
interface ServiceItem {
  id: string;
  name: string;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  salonId: string;
  salonName: string;
  categoryName: string | null;
  assignedStylistCount: number;
  reservationCount: number;
}
interface ServiceListResponse {
  items: ServiceItem[];
  total: number;
  page: number;
  pageSize: number;
}
type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: ServiceListResponse };

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency }).format(cents / 100);
}

export default function SuperadminServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState(searchParams.get('salonId') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [salons, setSalons] = useState<Salon[]>([]);
  const [actionService, setActionService] = useState<ServiceItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=200')
      .then((r) => setSalons(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    const q = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) q.set('search', search);
    if (salonFilter) q.set('salonId', salonFilter);
    if (statusFilter) q.set('status', statusFilter);

    apiFetch<ServiceListResponse>(`/superadmin/services?${q}`)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/superadmin/services');
          return;
        }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Xəta baş verdi.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [search, salonFilter, statusFilter, page, router]);

  async function handleToggle() {
    if (!actionService) return;
    setActionBusy(true);
    try {
      await apiFetch(`/superadmin/services/${actionService.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !actionService.isActive }),
      });
      showToast(actionService.isActive ? 'Xidmət deaktiv edildi' : 'Xidmət aktivləşdirildi');
      setActionService(null);
      setPage((p) => p); // re-trigger load
      setState({ kind: 'loading' });
      const q = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) q.set('search', search);
      if (salonFilter) q.set('salonId', salonFilter);
      if (statusFilter) q.set('status', statusFilter);
      apiFetch<ServiceListResponse>(`/superadmin/services?${q}`)
        .then((data) => setState({ kind: 'ready', data }))
        .catch((err: unknown) =>
          setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta' }),
        );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setActionBusy(false);
    }
  }

  if (state.kind === 'loading')
    return (
      <main className="dashboard-page">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
      </main>
    );
  if (state.kind === 'permission-denied')
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  if (state.kind === 'error')
    return (
      <main className="dashboard-page">
        <ErrorState title="Xidmətlər yüklənmədi" description={state.message} />
      </main>
    );

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="dashboard-page">
      <PageHeader
        title="Xidmətlər"
        description={`${total} xidmət tapıldı`}
        actions={<LinkButton href="/superadmin/services/new">+ Yeni xidmət</LinkButton>}
      />

      <FilterBar
        search={
          <Input
            placeholder="Xidmət adı axtar..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            aria-label="Xidmət axtar"
          />
        }
      >
        <Select
          value={salonFilter}
          onChange={(e) => {
            setPage(1);
            setSalonFilter(e.target.value);
          }}
          aria-label="Salon filtri"
          className="sm:max-w-52"
        >
          <option value="">Bütün salonlar</option>
          {salons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          aria-label="Status filtri"
          className="sm:max-w-44"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </Select>
      </FilterBar>

      {items.length === 0 ? (
        <EmptyState title="Xidmət tapılmadı" description="Fərqli axtarış parametrləri yoxlayın." />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: 'Xidmət',
                render: (r: ServiceItem) => (
                  <Link href={`/superadmin/services/${r.id}`}>{r.name}</Link>
                ),
              },
              {
                key: 'salon',
                header: 'Salon',
                render: (r: ServiceItem) => (
                  <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                ),
              },
              {
                key: 'category',
                header: 'Kateqoriya',
                render: (r: ServiceItem) => r.categoryName ?? '—',
              },
              {
                key: 'price',
                header: 'Qiymət',
                render: (r: ServiceItem) => fmt(r.priceAmount, r.currency),
              },
              {
                key: 'duration',
                header: 'Müddət',
                render: (r: ServiceItem) => `${r.durationMinutes} dəq`,
              },
              {
                key: 'stylists',
                header: 'Stilistlər',
                render: (r: ServiceItem) => r.assignedStylistCount,
              },
              {
                key: 'reservations',
                header: 'Rezerv.',
                render: (r: ServiceItem) => r.reservationCount,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: ServiceItem) => (
                  <Badge tone={r.isActive ? 'success' : 'neutral'}>
                    {r.isActive ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (r: ServiceItem) => (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/superadmin/services/${r.id}/edit`} style={{ fontSize: '0.8rem' }}>
                      Redaktə
                    </Link>
                    <Button
                      variant={r.isActive ? 'destructive' : 'secondary'}
                      onClick={() => setActionService(r)}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      {r.isActive ? 'Deaktiv' : 'Aktiv'}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={items}
            getRowKey={(r) => r.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => <Link href={`/superadmin/services/${r.id}`}>{r.name}</Link>}
            renderSecondary={(r) =>
              `${r.salonName} · ${fmt(r.priceAmount, r.currency)} · ${r.durationMinutes} dəq`
            }
            renderAction={(r) => (
              <Badge tone={r.isActive ? 'success' : 'neutral'}>
                {r.isActive ? 'Aktiv' : 'Deaktiv'}
              </Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {actionService && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setActionService(null)}
          title={
            actionService.isActive
              ? 'Xidməti deaktiv etmək istəyirsiniz?'
              : 'Xidməti aktivləşdirmək istəyirsiniz?'
          }
          description={
            actionService.isActive
              ? `"${actionService.name}" xidməti yeni rezervasiyalar üçün bağlanacaq. Mövcud rezervasiyalar qalacaq.`
              : `"${actionService.name}" xidməti yenidən onlayn bronlamaya açılacaq.`
          }
          confirmLabel={actionService.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
          destructive={actionService.isActive}
          confirming={actionBusy}
          onConfirm={handleToggle}
        />
      )}
    </main>
  );
}
