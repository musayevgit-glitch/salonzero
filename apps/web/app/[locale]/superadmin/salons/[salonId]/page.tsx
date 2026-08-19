'use client';

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Input,
  Link,
  Pagination,
  PermissionDeniedState,
  Select,
  Skeleton,
  Table,
  Tabs,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { PhotoUploadWidget } from '../../_components/PhotoUploadWidget';
import { LinkButton } from '../../../../_components/admin/LinkButton';

// ── Types ──────────────────────────────────────────────────────────────────
interface SalonDetail {
  id: string; slug: string; name: string; status: 'ACTIVE' | 'SUSPENDED';
  city: string | null; timezone: string; description: string | null;
  addressLine: string | null; phone: string | null; email: string | null;
  subdomain: string | null; customDomain: string | null; genderFocus: string | null;
  coverUrl: string | null; logoUrl: string | null; activeMembershipCount: number;
  updatedAt: string;
}
interface Stylist {
  id: string; fullName: string; photoUrl: string | null; isActive: boolean; createdAt: string;
}
interface Service {
  id: string; name: string; priceAmount: number; currency: string; durationMinutes: number;
  isActive: boolean; categoryName: string | null;
}
interface Reservation {
  id: string; startAt: string; customerName: string; serviceName: string;
  employeeName: string | null; status: string; priceAmount: number; currency: string;
}

type LS<T> = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: T };

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}
const STATUS_AZ: Record<string, string> = {
  PENDING: 'Gözləyir', CONFIRMED: 'Təsdiqlənib', CHECKED_IN: 'Gəlib',
  COMPLETED: 'Tamamlanıb', CANCELLED_BY_CUSTOMER: 'Müş. ləğv', CANCELLED_BY_SALON: 'Salon ləğv',
  NO_SHOW: 'Gəlmədi',
};
const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning', CONFIRMED: 'success', CHECKED_IN: 'success',
  COMPLETED: 'success', CANCELLED_BY_CUSTOMER: 'neutral', CANCELLED_BY_SALON: 'neutral', NO_SHOW: 'danger',
};
function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  return url
    ? <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
    : (
      <span className="inline-flex items-center justify-center rounded-full bg-surface text-text-secondary font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.4, border: '1px solid var(--color-border)' }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
}

// ── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ salon, onReload }: { salon: SalonDetail; onReload: () => void }) {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLifecycle() {
    setBusy(true);
    const action = salon.status === 'ACTIVE' ? 'suspend' : 'restore';
    try {
      await apiFetch(`/salons/${salon.id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
      showToast(action === 'suspend' ? 'Salon deaktiv edildi' : 'Salon aktivləşdirildi');
      setConfirmOpen(false);
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setBusy(false);
    }
  }

  const isActive = salon.status === 'ACTIVE';
  const fields: [string, string | null | number][] = [
    ['Slug', salon.slug], ['Şəhər', salon.city], ['Vaxt zonası', salon.timezone],
    ['Ünvan', salon.addressLine], ['Telefon', salon.phone], ['E-poçt', salon.email],
    ['Subdomain', salon.subdomain], ['Xüsusi domen', salon.customDomain],
    ['Cinsiyyət fokus', salon.genderFocus], ['Aktiv işçilər', salon.activeMembershipCount],
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Photos */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Örtük şəkli</h3>
          <PhotoUploadWidget
            label="Örtük"
            currentUrl={salon.coverUrl}
            uploadPath={`/superadmin/salons/${salon.id}/cover-photo`}
            aspectRatio="16/7"
            onUpdated={onReload}
            onRemoved={onReload}
          />
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Logo</h3>
          <PhotoUploadWidget
            label="Logo"
            currentUrl={salon.logoUrl}
            uploadPath={`/superadmin/salons/${salon.id}/logo`}
            rounded
            onUpdated={onReload}
            onRemoved={onReload}
          />
        </Card>
      </div>

      {/* Info */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Əsas məlumatlar</h3>
          <div className="flex items-center gap-3">
            <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Aktiv' : 'Deaktiv'}</Badge>
            <Link href={`/superadmin/salons/${salon.id}/edit`} className="text-sm">Redaktə et</Link>
            <Button variant={isActive ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)}>
              {isActive ? 'Deaktiv et' : 'Aktivləşdir'}
            </Button>
          </div>
        </div>
        {salon.description && (
          <p className="mb-4 text-sm text-text-secondary">{salon.description}</p>
        )}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-surface px-3 py-2">
              <dt className="shrink-0 text-text-secondary">{label}</dt>
              <dd className="min-w-0 break-all text-right font-medium text-text-primary">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title={isActive ? 'Salonu deaktiv etmək istəyirsiniz?' : 'Salonu aktivləşdirmək istəyirsiniz?'}
        description={isActive
          ? 'İşçilərin girişi dayandırılacaq və salon ictimai görünüşdən silinəcək.'
          : 'İşçi girişi və ictimai görünüş bərpa ediləcək.'}
        confirmLabel={isActive ? 'Deaktiv et' : 'Aktivləşdir'}
        destructive={isActive} confirming={busy} onConfirm={handleLifecycle}
      />
    </div>
  );
}

// ── Tab: Stilistlər ──────────────────────────────────────────────────────────
function StylistsTab({ salonId }: { salonId: string }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LS<{ items: Stylist[]; total: number; pageSize: number }>>({ kind: 'loading' });
  const [confirmTarget, setConfirmTarget] = useState<Stylist | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ salonId, page: String(page), pageSize: '20' });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    apiFetch<{ items: Stylist[]; total: number; pageSize: number }>(`/superadmin/stylists?${q}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta' }));
  }, [salonId, search, status, page]);

  useEffect(() => { setState({ kind: 'loading' }); load(); }, [load]);

  async function toggleActive(stylist: Stylist) {
    setBusy(true);
    try {
      await apiFetch(`/superadmin/stylists/${stylist.id}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !stylist.isActive }),
      });
      showToast(stylist.isActive ? 'Stilist deaktiv edildi' : 'Stilist aktivləşdirildi');
      setConfirmTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Ada görə axtar" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-xs" />
          <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-40">
            <option value="">Bütün statuslar</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Deaktiv</option>
          </Select>
        </div>
        <Link href={`/superadmin/stylists/new?salonId=${salonId}`}>+ Yeni stilist</Link>
      </div>

      {state.kind === 'loading' && <Skeleton className="h-64 w-full" />}
      {state.kind === 'error' && <ErrorState title="Stilistlər yüklənmədi" description={state.message} />}
      {state.kind === 'ready' && (
        <>
          {state.data.items.length === 0
            ? <EmptyState title="Stilist tapılmadı" description="Axtarışı dəyişin və ya yeni stilist əlavə edin." />
            : (
              <Table
                columns={[
                  {
                    key: 'name', header: 'Ad',
                    render: (r: Stylist) => (
                      <div className="flex items-center gap-3">
                        <Avatar url={r.photoUrl} name={r.fullName} />
                        <Link href={`/superadmin/stylists/${r.id}`} className="font-medium">{r.fullName}</Link>
                      </div>
                    ),
                  },
                  {
                    key: 'status', header: 'Status',
                    render: (r: Stylist) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>,
                  },
                  {
                    key: 'added', header: 'Əlavə edilib',
                    render: (r: Stylist) => new Date(r.createdAt).toLocaleDateString('az-AZ'),
                  },
                  {
                    key: 'actions', header: '',
                    render: (r: Stylist) => (
                      <DropdownMenu
                        trigger={<button className="rounded p-1 text-text-secondary hover:bg-surface" aria-label="Əməliyyatlar">⋮</button>}
                        items={[
                          { label: 'Profilə keç', onSelect: () => window.location.href = `/superadmin/stylists/${r.id}` },
                          { label: 'Redaktə et', onSelect: () => window.location.href = `/superadmin/stylists/${r.id}/edit` },
                          { label: r.isActive ? 'Deaktiv et' : 'Aktivləşdir', onSelect: () => setConfirmTarget(r), destructive: r.isActive },
                        ]}
                      />
                    ),
                  },
                ]}
                rows={state.data.items}
                getRowKey={(r) => r.id}
              />
            )}
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(state.data.total / state.data.pageSize))} onPageChange={setPage} />
        </>
      )}

      {confirmTarget && (
        <ConfirmDialog
          open onOpenChange={() => setConfirmTarget(null)}
          title={confirmTarget.isActive ? 'Stilisti deaktiv etmək istəyirsiniz?' : 'Stilisti aktivləşdirmək istəyirsiniz?'}
          description={confirmTarget.isActive ? 'Yeni rezervasiyalar üçün əlçatmaz olacaq.' : 'Yenidən rezervasiya qəbul edəcək.'}
          confirmLabel={confirmTarget.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
          destructive={confirmTarget.isActive} confirming={busy}
          onConfirm={() => toggleActive(confirmTarget)}
        />
      )}
    </div>
  );
}

// ── Tab: Xidmətlər ───────────────────────────────────────────────────────────
function ServicesTab({ salonId }: { salonId: string }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LS<{ items: Service[]; total: number; pageSize: number }>>({ kind: 'loading' });
  const [confirmTarget, setConfirmTarget] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams({ salonId, page: String(page), pageSize: '20' });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    apiFetch<{ items: Service[]; total: number; pageSize: number }>(`/superadmin/services?${q}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta' }));
  }, [salonId, search, status, page]);

  useEffect(() => { setState({ kind: 'loading' }); load(); }, [load]);

  async function toggleActive(svc: Service) {
    setBusy(true);
    try {
      await apiFetch(`/superadmin/services/${svc.id}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !svc.isActive }),
      });
      showToast(svc.isActive ? 'Xidmət deaktiv edildi' : 'Xidmət aktivləşdirildi');
      setConfirmTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Ada görə axtar" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-xs" />
          <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-40">
            <option value="">Bütün statuslar</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Deaktiv</option>
          </Select>
        </div>
        <Link href={`/superadmin/services/new?salonId=${salonId}`}>+ Yeni xidmət</Link>
      </div>

      {state.kind === 'loading' && <Skeleton className="h-64 w-full" />}
      {state.kind === 'error' && <ErrorState title="Xidmətlər yüklənmədi" description={state.message} />}
      {state.kind === 'ready' && (
        <>
          {state.data.items.length === 0
            ? <EmptyState title="Xidmət tapılmadı" />
            : (
              <Table
                columns={[
                  { key: 'name', header: 'Ad', render: (r: Service) => <Link href={`/superadmin/services/${r.id}`} className="font-medium">{r.name}</Link> },
                  { key: 'cat', header: 'Kateqoriya', render: (r: Service) => r.categoryName ?? '—' },
                  { key: 'price', header: 'Qiymət', render: (r: Service) => <span className="font-medium">{fmt(r.priceAmount, r.currency)}</span> },
                  { key: 'dur', header: 'Müddət', render: (r: Service) => `${r.durationMinutes} dəq` },
                  { key: 'status', header: 'Status', render: (r: Service) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge> },
                  {
                    key: 'actions', header: '',
                    render: (r: Service) => (
                      <DropdownMenu
                        trigger={<button className="rounded p-1 text-text-secondary hover:bg-surface" aria-label="Əməliyyatlar">⋮</button>}
                        items={[
                          { label: 'Redaktə et', onSelect: () => window.location.href = `/superadmin/services/${r.id}/edit` },
                          { label: r.isActive ? 'Deaktiv et' : 'Aktivləşdir', onSelect: () => setConfirmTarget(r), destructive: r.isActive },
                        ]}
                      />
                    ),
                  },
                ]}
                rows={state.data.items}
                getRowKey={(r) => r.id}
              />
            )}
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(state.data.total / state.data.pageSize))} onPageChange={setPage} />
        </>
      )}

      {confirmTarget && (
        <ConfirmDialog
          open onOpenChange={() => setConfirmTarget(null)}
          title={confirmTarget.isActive ? 'Xidməti deaktiv etmək istəyirsiniz?' : 'Xidməti aktivləşdirmək istəyirsiniz?'}
          description="" confirmLabel={confirmTarget.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
          destructive={confirmTarget.isActive} confirming={busy}
          onConfirm={() => toggleActive(confirmTarget)}
        />
      )}
    </div>
  );
}

// ── Tab: Rezervasiyalar ──────────────────────────────────────────────────────
function ReservationsTab({ salonId }: { salonId: string }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LS<{ items: Reservation[]; total: number; pageSize: number }>>({ kind: 'loading' });

  const load = useCallback(() => {
    const q = new URLSearchParams({ salonId, page: String(page), pageSize: '20' });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    apiFetch<{ items: Reservation[]; total: number; pageSize: number }>(`/superadmin/reservations?${q}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta' }));
  }, [salonId, search, status, page]);

  useEffect(() => { setState({ kind: 'loading' }); load(); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Müştəri adı axtar" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-xs" />
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-48">
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_AZ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      {state.kind === 'loading' && <Skeleton className="h-64 w-full" />}
      {state.kind === 'error' && <ErrorState title="Rezervasiyalar yüklənmədi" description={state.message} />}
      {state.kind === 'ready' && (
        <>
          {state.data.items.length === 0
            ? <EmptyState title="Rezervasiya tapılmadı" />
            : (
              <Table
                columns={[
                  { key: 'date', header: 'Tarix', render: (r: Reservation) => new Date(r.startAt).toLocaleDateString('az-AZ') },
                  { key: 'time', header: 'Saat', render: (r: Reservation) => new Date(r.startAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }) },
                  { key: 'customer', header: 'Müştəri', render: (r: Reservation) => <span className="font-medium">{r.customerName}</span> },
                  { key: 'service', header: 'Xidmət', render: (r: Reservation) => r.serviceName },
                  { key: 'employee', header: 'Stilist', render: (r: Reservation) => r.employeeName ?? '—' },
                  { key: 'price', header: 'Məbləğ', render: (r: Reservation) => fmt(r.priceAmount, r.currency) },
                  { key: 'status', header: 'Status', render: (r: Reservation) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{STATUS_AZ[r.status] ?? r.status}</Badge> },
                ]}
                rows={state.data.items}
                getRowKey={(r) => r.id}
              />
            )}
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(state.data.total / state.data.pageSize))} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
type PageState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; salon: SalonDetail };

export default function SuperadminSalonDetailPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    apiFetch<SalonDetail>(`/salons/${salonId}`)
      .then((salon) => setState({ kind: 'ready', salon }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) { router.replace(`/login?returnTo=/superadmin/salons/${salonId}`); return; }
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'not-found' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }, [salonId, router]);

  useEffect(() => { load(); }, [load]);

  if (state.kind === 'loading') return <main className="dashboard-page"><Skeleton className="h-12 w-64 mb-6" /><Skeleton className="h-96 w-full" /></main>;
  if (state.kind === 'not-found') return <main className="dashboard-page"><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main className="dashboard-page"><ErrorState title="Salon yüklənmədi" description={state.message} /></main>;

  const { salon } = state;

  return (
    <main className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <Breadcrumbs items={[{ label: 'Salonlar', href: '/superadmin/salons' }, { label: salon.name }]} />
          <div className="mt-3 flex items-center gap-4">
            {salon.logoUrl && (
              <img src={salon.logoUrl} alt={salon.name} className="h-12 w-12 rounded-full border border-border object-cover" />
            )}
            <div className="min-w-0">
              <h1 className="page-header-title">{salon.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <span>{salon.city ?? salon.timezone}</span>
                <Badge tone={salon.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {salon.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}
                </Badge>
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <LinkButton href={`/superadmin/salons/${salonId}/edit`} variant="secondary">
            Redaktə et
          </LinkButton>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'overview', label: 'Ümumi', content: <OverviewTab salon={salon} onReload={load} /> },
          { value: 'stylists', label: 'Stilistlər', content: <StylistsTab salonId={salonId} /> },
          { value: 'services', label: 'Xidmətlər', content: <ServicesTab salonId={salonId} /> },
          { value: 'reservations', label: 'Rezervasiyalar', content: <ReservationsTab salonId={salonId} /> },
        ]}
      />
    </main>
  );
}
