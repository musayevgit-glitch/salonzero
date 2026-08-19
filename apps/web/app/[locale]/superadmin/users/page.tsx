'use client';

import {
  Badge,
  Button,
  ConfirmDialog,
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
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { FilterBar } from '../../../_components/admin/FilterBar';
import { PageHeader } from '../../../_components/admin/PageHeader';

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
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [role, setRole] = useState<'' | 'SUPERADMIN' | 'STYLIST' | 'CUSTOMER'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // Modal State
  const [actionUser, setActionUser] = useState<UserListItem | null>(null);
  const [actionType, setActionType] = useState<'TOGGLE_ADMIN' | 'TOGGLE_STATUS' | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Loaded current user profile so we can check ourselves
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ email: string }>('/auth/me')
      .then((u) => setCurrentUserEmail(u.email))
      .catch(() => undefined);
  }, []);

  function load() {
    setState({ kind: 'loading' });
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
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
  }

  useEffect(load, [search, status, role, page, router]);

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

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
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
        <ErrorState title="İstifadəçiləri yükləmək mümkün olmadı" description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="dashboard-page">
      <PageHeader title="İstifadəçilər" description={`Cəmi ${total} istifadəçi`} />

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

      {items.length === 0 ? (
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
                    {!row.isSuperadmin && !row.isStylist && (
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
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={isSelf}
                        onClick={() => {
                          setActionUser(row);
                          setActionType('TOGGLE_ADMIN');
                        }}
                      >
                        {row.isSuperadmin ? 'Adminliyi ləğv et' : 'Admin et'}
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
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionUser(row);
                      setActionType('TOGGLE_ADMIN');
                    }}
                  >
                    Admin
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
