'use client';

import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  Select,
  Skeleton,
  Table,
  useToast,
} from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { fetchAllSalons, type SalonOption } from '../../../../lib/fetch-all-salons';
import { useDebouncedValue } from '../../../../lib/use-debounced-value';
import { FilterBar } from '../../../_components/admin/FilterBar';
import { PageHeader } from '../../../_components/admin/PageHeader';

interface UserMembership {
  salonId: string;
  salonName: string;
  role: 'SALON_ADMIN' | 'SALON_MANAGER';
  status: 'ACTIVE' | 'SUSPENDED';
}

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  isSuperadmin: boolean;
  createdAt: string;
  isStylist: boolean;
  salonName: string | null;
  memberships: UserMembership[];
}

interface UserListResponse {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: UserListResponse };

export default function SuperadminUsersPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [role, setRole] = useState<'' | 'SUPERADMIN' | 'STYLIST' | 'CUSTOMER'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // Modal State
  const [actionUser, setActionUser] = useState<UserListItem | null>(null);
  const [actionType, setActionType] = useState<'TOGGLE_ADMIN' | 'TOGGLE_STATUS' | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Salon assignment modal
  const [assignUser, setAssignUser] = useState<UserListItem | null>(null);
  const [assignSalonId, setAssignSalonId] = useState('');
  const [assignRole, setAssignRole] = useState<'SALON_ADMIN' | 'SALON_MANAGER'>('SALON_ADMIN');
  const [assignBusy, setAssignBusy] = useState(false);
  const [salons, setSalons] = useState<SalonOption[] | null>(null);
  const [salonsError, setSalonsError] = useState<string | null>(null);

  // Loaded current user profile so we can check ourselves
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ email: string }>('/auth/me')
      .then((u) => setCurrentUserEmail(u.email))
      .catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (debouncedSearch) query.set('search', debouncedSearch);
    if (status) query.set('status', status);
    if (role) query.set('role', role);

    apiFetch<UserListResponse>(`/superadmin/users?${query.toString()}`)
      .then((data) => {
        setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/superadmin/users');
          return;
        }
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }, [debouncedSearch, status, role, page, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Salon list for the assignment modal — loaded once, on first open.
  useEffect(() => {
    if (!assignUser || salons !== null) return;
    fetchAllSalons({ status: 'ACTIVE' })
      .then((items) => setSalons(items))
      .catch((err: unknown) => {
        setSalonsError(err instanceof ApiError ? err.message : 'Salonları yükləmək mümkün olmadı.');
        setSalons([]);
      });
  }, [assignUser, salons]);

  async function handleAssignSalon() {
    if (!assignUser || !assignSalonId) return;
    setAssignBusy(true);
    try {
      await apiFetch(`/superadmin/users/${assignUser.id}/assign-salon`, {
        method: 'POST',
        body: JSON.stringify({ salonId: assignSalonId, role: assignRole }),
      });
      showToast('İstifadəçi salona təyin edildi');
      setAssignUser(null);
      setAssignSalonId('');
      setAssignRole('SALON_ADMIN');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleRevokeMembership(user: UserListItem, salonId: string) {
    setAssignBusy(true);
    try {
      await apiFetch(
        `/superadmin/users/${user.id}/assign-salon?salonId=${encodeURIComponent(salonId)}`,
        { method: 'DELETE' },
      );
      showToast('Salon səlahiyyəti ləğv edildi');
      setAssignUser(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleActionConfirm() {
    if (!actionUser || !actionType) return;
    setActionBusy(true);

    let payload: Record<string, unknown> = {};
    if (actionType === 'TOGGLE_ADMIN') {
      payload = { isSuperadmin: !actionUser.isSuperadmin };
    } else if (actionType === 'TOGGLE_STATUS') {
      payload = { status: actionUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' };
    }

    try {
      await apiFetch(`/superadmin/users/${actionUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      showToast('İstifadəçi uğurla yeniləndi');
      setActionUser(null);
      setActionType(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setActionBusy(false);
    }
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  }

  const data = state.kind === 'ready' ? state.data : null;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="dashboard-page">
      <PageHeader
        title="İstifadəçilər"
        description={data ? `Cəmi ${total} istifadəçi` : 'Yüklənir…'}
      />

      <FilterBar
        search={
          <Input
            placeholder="Ad, e-poçt və ya telefon axtar"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            aria-label="İstifadəçi axtar"
          />
        }
      >
        <Select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value as typeof role);
          }}
          aria-label="Rol filtri"
          className="sm:max-w-48"
        >
          <option value="">Bütün rollar</option>
          <option value="SUPERADMIN">Superadmin</option>
          <option value="STYLIST">Usta (Stilist)</option>
          <option value="CUSTOMER">Müştəri</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
          aria-label="Status filtri"
          className="sm:max-w-44"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="SUSPENDED">Bloklanmış</option>
        </Select>
      </FilterBar>

      {state.kind === 'loading' ? (
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
      ) : state.kind === 'error' ? (
        <ErrorState title="İstifadəçiləri yükləmək mümkün olmadı" description={state.message} />
      ) : items.length === 0 ? (
        <EmptyState
          title="İstifadəçi tapılmadı"
          description="Fərqli axtarış parametri və ya filtr yoxlayın."
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'fullName',
                header: 'Ad Soyad',
                render: (row: UserListItem) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary">{row.fullName}</span>
                    <span className="text-xs text-text-secondary">{row.email}</span>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Rol',
                render: (row: UserListItem) => (
                  <div className="flex flex-wrap gap-1">
                    {row.isSuperadmin && <Badge tone="neutral">Superadmin</Badge>}
                    {row.isStylist && (
                      <Badge tone="warning">
                        Usta ({row.salonName ?? 'Salon'})
                      </Badge>
                    )}
                    {row.memberships.map((m) => (
                      <Badge key={m.salonId} tone="success">
                        {m.role === 'SALON_ADMIN' ? 'Salon admini' : 'Menecer'} ({m.salonName})
                      </Badge>
                    ))}
                    {!row.isSuperadmin && !row.isStylist && row.memberships.length === 0 && (
                      <Badge tone="neutral">Müştəri</Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'phone',
                header: 'Telefon',
                render: (row: UserListItem) => row.phone ?? '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row: UserListItem) => (
                  <Badge tone={row.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {row.status === 'ACTIVE' ? 'Aktiv' : 'Bloklu'}
                  </Badge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Qeydiyyat',
                render: (row: UserListItem) =>
                  new Date(row.createdAt).toLocaleDateString('az-AZ'),
              },
              {
                key: 'actions',
                header: 'Əməliyyatlar',
                render: (row: UserListItem) => {
                  const isSelf = row.email === currentUserEmail;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={row.status !== 'ACTIVE'}
                        onClick={() => {
                          setAssignUser(row);
                          setAssignSalonId(row.memberships[0]?.salonId ?? '');
                          setAssignRole(row.memberships[0]?.role ?? 'SALON_ADMIN');
                        }}
                      >
                        Admin et
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={isSelf}
                        onClick={() => {
                          setActionUser(row);
                          setActionType('TOGGLE_ADMIN');
                        }}
                      >
                        {row.isSuperadmin ? 'Superadminliyi ləğv et' : 'Superadmin et'}
                      </Button>
                      <Button
                        variant={row.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                        disabled={isSelf}
                        onClick={() => {
                          setActionUser(row);
                          setActionType('TOGGLE_STATUS');
                        }}
                      >
                        {row.status === 'ACTIVE' ? 'Blokla' : 'Aktivləşdir'}
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            rows={items}
            getRowKey={(row) => row.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(row) => row.id}
            renderPrimary={(row) => (
              <div className="flex flex-col">
                <span className="font-medium text-text-primary">{row.fullName}</span>
                <span className="text-xs text-text-secondary">{row.email}</span>
              </div>
            )}
            renderSecondary={(row) => (
              <div className="flex gap-1 text-xs">
                {row.isSuperadmin ? 'Admin' : row.isStylist ? 'Usta' : 'Müştəri'} ·{' '}
                {row.status === 'ACTIVE' ? 'Aktiv' : 'Bloklu'}
              </div>
            )}
            renderAction={(row) => {
              const isSelf = row.email === currentUserEmail;
              if (isSelf) return <span className="text-xs text-text-secondary">Siz</span>;
              return (
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="secondary"
                    disabled={row.status !== 'ACTIVE'}
                    onClick={() => {
                      setAssignUser(row);
                      setAssignSalonId(row.memberships[0]?.salonId ?? '');
                      setAssignRole(row.memberships[0]?.role ?? 'SALON_ADMIN');
                    }}
                  >
                    Admin et
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionUser(row);
                      setActionType('TOGGLE_ADMIN');
                    }}
                  >
                    Superadmin
                  </Button>
                  <Button
                    variant={row.status === 'ACTIVE' ? 'destructive' : 'secondary'}
                    onClick={() => {
                      setActionUser(row);
                      setActionType('TOGGLE_STATUS');
                    }}
                  >
                    {row.status === 'ACTIVE' ? 'Blokla' : 'Aktiv'}
                  </Button>
                </div>
              );
            }}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {/* Salon admin assignment */}
      {assignUser && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setAssignUser(null);
          }}
          title="Salon səlahiyyəti təyin et"
          description={`${assignUser.fullName} üçün salon və rol seçin.`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAssignUser(null)} disabled={assignBusy}>
                Ləğv et
              </Button>
              <Button
                onClick={handleAssignSalon}
                disabled={assignBusy || !assignSalonId || salons === null}
              >
                {assignBusy ? 'Yadda saxlanılır…' : 'Yadda saxla'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {assignUser.memberships.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-primary">Mövcud səlahiyyətlər</span>
                <ul className="flex flex-col gap-2">
                  {assignUser.memberships.map((m) => (
                    <li
                      key={m.salonId}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-surface px-3 py-2"
                    >
                      <span className="text-sm text-text-primary">
                        {m.salonName} —{' '}
                        {m.role === 'SALON_ADMIN' ? 'Salon admini' : 'Menecer'}
                      </span>
                      <Button
                        variant="destructive"
                        disabled={assignBusy}
                        onClick={() => handleRevokeMembership(assignUser, m.salonId)}
                      >
                        Ləğv et
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {salonsError && (
              <p className="text-sm text-danger" role="alert">
                {salonsError}
              </p>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-primary">Salon</span>
              <Select
                value={assignSalonId}
                onChange={(e) => setAssignSalonId(e.target.value)}
                disabled={salons === null}
                aria-label="Salon seçin"
              >
                <option value="">
                  {salons === null ? 'Yüklənir…' : 'Salon seçin'}
                </option>
                {(salons ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.city ? ` — ${s.city}` : ''}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-primary">Rol</span>
              <Select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as typeof assignRole)}
                aria-label="Rol seçin"
              >
                <option value="SALON_ADMIN">Salon admini</option>
                <option value="SALON_MANAGER">Salon meneceri</option>
              </Select>
            </label>
          </div>
        </Dialog>
      )}

      {/* Confirmation Dialogs */}
      {actionUser && actionType === 'TOGGLE_ADMIN' && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => !open && setActionUser(null)}
          title={
            actionUser.isSuperadmin
              ? 'Admin səlahiyyətini ləğv etmək istəyirsiniz?'
              : 'Superadmin təyin etmək istəyirsiniz?'
          }
          description={
            actionUser.isSuperadmin
              ? `${actionUser.fullName} adlı istifadəçinin bütün platformada superadmin səlahiyyətləri silinəcəkdir.`
              : `${actionUser.fullName} adlı istifadəçi platformanın bütün salonlarına, hesabatlarına və istifadəçilərinə tam nəzarət edə biləcəkdir.`
          }
          confirmLabel={actionUser.isSuperadmin ? 'Səlahiyyəti sil' : 'Təyin et'}
          destructive={actionUser.isSuperadmin}
          confirming={actionBusy}
          onConfirm={handleActionConfirm}
        />
      )}

      {actionUser && actionType === 'TOGGLE_STATUS' && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => !open && setActionUser(null)}
          title={
            actionUser.status === 'ACTIVE'
              ? 'İstifadəçini bloklamaq istəyirsiniz?'
              : 'İstifadəçinin blokunu açmaq istəyirsiniz?'
          }
          description={
            actionUser.status === 'ACTIVE'
              ? `${actionUser.fullName} adlı istifadəçi platformaya daxil ola bilməyəcək və heç bir rezervasiya edə bilməyəcək.`
              : `${actionUser.fullName} adlı istifadəçinin hesabı yenidən aktivləşdiriləcəkdir.`
          }
          confirmLabel={actionUser.status === 'ACTIVE' ? 'Blokla' : 'Blokdan çıxar'}
          destructive={actionUser.status === 'ACTIVE'}
          confirming={actionBusy}
          onConfirm={handleActionConfirm}
        />
      )}
    </main>
  );
}
