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

interface StylistListItem {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  salonId: string;
  salonName: string;
}

interface StylistListResponse {
  items: StylistListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: StylistListResponse };

export default function SuperadminStylistsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // Modal State
  const [actionStylist, setActionStylist] = useState<StylistListItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  function load() {
    setState({ kind: 'loading' });
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (status) query.set('status', status);

    apiFetch<StylistListResponse>(`/superadmin/stylists?${query.toString()}`)
      .then((data) => {
        setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/superadmin/stylists');
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

  useEffect(load, [search, status, page, router]);

  async function handleActionConfirm() {
    if (!actionStylist) return;
    setActionBusy(true);

    try {
      await apiFetch(`/superadmin/stylists/${actionStylist.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !actionStylist.isActive }),
      });
      showToast(actionStylist.isActive ? 'Usta deaktiv edildi' : 'Usta aktivləşdirildi');
      setActionStylist(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setActionBusy(false);
    }
  }

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
        <ErrorState title="Stilistləri yükləmək mümkün olmadı" description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Stilistlər (Ustalar)</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Stilist adı axtar"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
          className="sm:max-w-40"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Stilist tapılmadı"
          description="Fərqli axtarış parametri və ya filtr yoxlayın."
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'fullName',
                header: 'Usta',
                render: (row: StylistListItem) => (
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#f5ece4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#9c5f49', fontSize: '0.9rem',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {row.photoUrl ? (
                        <img src={row.photoUrl} alt={row.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        row.fullName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-primary">{row.fullName}</span>
                      <span className="text-xs text-text-secondary">Salon: {row.salonName}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'bio',
                header: 'Bioqrafiya',
                render: (row: StylistListItem) => (
                  <span className="text-sm text-text-secondary block max-w-xs truncate">
                    {row.bio ?? '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row: StylistListItem) => (
                  <Badge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Yaradıldı',
                render: (row: StylistListItem) =>
                  new Date(row.createdAt).toLocaleDateString('az-AZ'),
              },
              {
                key: 'actions',
                header: 'Əməliyyatlar',
                render: (row: StylistListItem) => (
                  <Button
                    variant={row.isActive ? 'destructive' : 'secondary'}
                    onClick={() => setActionStylist(row)}
                  >
                    {row.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
                  </Button>
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
              <div className="flex flex-col">
                <span className="font-medium text-text-primary">{row.fullName}</span>
                <span className="text-xs text-text-secondary">{row.salonName}</span>
              </div>
            )}
            renderSecondary={(row) => (
              <div className="text-xs text-text-secondary">
                {row.isActive ? 'Aktiv' : 'Deaktiv'}
              </div>
            )}
            renderAction={(row) => (
              <Button
                variant={row.isActive ? 'destructive' : 'secondary'}
                onClick={() => setActionStylist(row)}
              >
                {row.isActive ? 'Deaktiv' : 'Aktiv'}
              </Button>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {/* Confirmation Dialog */}
      {actionStylist && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => !open && setActionStylist(null)}
          title={
            actionStylist.isActive
              ? 'Stilisti deaktiv etmək istəyirsiniz?'
              : 'Stilisti aktivləşdirmək istəyirsiniz?'
          }
          description={
            actionStylist.isActive
              ? `${actionStylist.fullName} adlı usta müştərilər tərəfindən görünməyəcək və yeni rezervasiyalar qəbul edə bilməyəcək.`
              : `${actionStylist.fullName} adlı usta yenidən müştərilərə göstəriləcək və iş qrafikinə uyğun saatlar təklif olunacaq.`
          }
          confirmLabel={actionStylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
          destructive={actionStylist.isActive}
          confirming={actionBusy}
          onConfirm={handleActionConfirm}
        />
      )}
    </main>
  );
}
