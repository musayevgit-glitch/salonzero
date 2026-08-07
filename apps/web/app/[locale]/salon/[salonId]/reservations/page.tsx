'use client';

import {
  Badge,
  Button,
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
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface ReservationListItem {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  service: { id: string; name: string };
  employee: { id: string; fullName: string };
  customer: { id: string; fullName: string; email: string };
  availableActions: string[];
}

interface ReservationListResponse {
  items: ReservationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: ReservationListResponse };

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CHECKED_IN: 'success',
  COMPLETED: 'neutral',
  REJECTED: 'danger',
  CANCELLED_BY_CUSTOMER: 'danger',
  CANCELLED_BY_SALON: 'danger',
  NO_SHOW: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED_BY_CUSTOMER: 'Cancelled (customer)',
  CANCELLED_BY_SALON: 'Cancelled (salon)',
  NO_SHOW: 'No-show',
};

function toLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(dateInput: string): Date {
  const parts = dateInput.split('-').map(Number);
  const [y, m, d] = [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

type ViewMode = 'today' | 'day' | 'week';

export default function SalonReservationsPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInput(new Date()));
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const reference = viewMode === 'today' ? new Date() : startOfLocalDay(selectedDate);
    if (viewMode === 'week') {
      const weekStart = startOfWeek(reference);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return { from: weekStart, to: weekEnd };
    }
    const dayStart =
      viewMode === 'today' ? startOfLocalDay(toLocalDateInput(new Date())) : reference;
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    return { from: dayStart, to: dayEnd };
  }, [viewMode, selectedDate]);

  useEffect(() => {
    apiFetch<{ services: unknown[]; employees: { id: string; fullName: string }[] }>(
      `/salons/${salonId}/reservations/booking-options`,
    )
      .then((data) => setEmployees(data.employees))
      .catch(() => {
        /* non-fatal — filters just won't offer an employee list */
      });
  }, [salonId]);

  function load() {
    setState({ kind: 'loading' });
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '20',
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (status) query.set('status', status);
    if (employeeId) query.set('employeeId', employeeId);
    if (search) query.set('search', search);

    apiFetch<ReservationListResponse>(`/salons/${salonId}/reservations?${query.toString()}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/reservations`);
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
  }

  useEffect(load, [salonId, viewMode, selectedDate, status, employeeId, search, page]);

  const QUICK_ACTION = {
    confirm: { label: 'Confirm', path: 'confirm' },
    checkIn: { label: 'Check in', path: 'check-in' },
    complete: { label: 'Complete', path: 'complete' },
  } as const;
  type QuickActionKey = keyof typeof QUICK_ACTION;

  async function runQuickAction(reservationId: string, action: QuickActionKey) {
    setActionBusyId(reservationId);
    setBanner(null);
    try {
      await apiFetch(
        `/salons/${salonId}/reservations/${reservationId}/${QUICK_ACTION[action].path}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setBanner('That reservation changed since this list loaded — refreshing.');
        load();
      } else {
        setBanner(err instanceof ApiError ? err.message : 'Something went wrong.');
      }
    } finally {
      setActionBusyId(null);
    }
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
        <ErrorState title="Couldn't load reservations" description={state.message} />
      </main>
    );
  }

  const items = state.kind === 'ready' ? state.data.items : [];
  const total = state.kind === 'ready' ? state.data.total : 0;
  const pageCount =
    state.kind === 'ready' ? Math.max(1, Math.ceil(total / state.data.pageSize)) : 1;

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-text-primary">Reservations</h1>
        <Link href={`/salon/${salonId}/reservations/new`}>
          <Button>New reservation</Button>
        </Link>
      </div>

      {banner ? (
        <div className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {banner}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="View">
        {(['today', 'day', 'week'] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'primary' : 'secondary'}
            onClick={() => {
              setViewMode(mode);
              setPage(1);
            }}
          >
            {mode === 'today' ? 'Today' : mode === 'day' ? 'Day' : 'Week'}
          </Button>
        ))}
        {viewMode !== 'today' ? (
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            aria-label={viewMode === 'week' ? 'Any day in the target week' : 'Day'}
            className="w-auto"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search customer name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search"
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Status"
          className="max-w-[200px]"
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            setPage(1);
          }}
          aria-label="Stylist"
          className="max-w-[200px]"
        >
          <option value="">All stylists</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </Select>
      </div>

      {state.kind === 'loading' ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No reservations"
          description="No reservations match the current filters for this range."
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'time',
                header: 'Time',
                render: (r: ReservationListItem) => (
                  <Link href={`/salon/${salonId}/reservations/${r.id}`}>
                    {new Date(r.startAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Link>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (r: ReservationListItem) => r.customer.fullName,
              },
              {
                key: 'service',
                header: 'Service',
                render: (r: ReservationListItem) => r.service.name,
              },
              {
                key: 'stylist',
                header: 'Stylist',
                render: (r: ReservationListItem) => r.employee.fullName,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: ReservationListItem) => (
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                ),
              },
              {
                key: 'action',
                header: '',
                render: (r: ReservationListItem) => {
                  const key = (['confirm', 'checkIn', 'complete'] as const).find((a) =>
                    r.availableActions.includes(a),
                  );
                  if (!key) return null;
                  return (
                    <Button
                      variant="secondary"
                      onClick={() => runQuickAction(r.id, key)}
                      loading={actionBusyId === r.id}
                    >
                      {QUICK_ACTION[key].label}
                    </Button>
                  );
                },
              },
            ]}
            rows={items}
            getRowKey={(r) => r.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => (
              <Link href={`/salon/${salonId}/reservations/${r.id}`}>
                {r.customer.fullName} — {r.service.name}
              </Link>
            )}
            renderSecondary={(r) => (
              <>
                {new Date(r.startAt).toLocaleString(undefined, {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                · {STATUS_LABEL[r.status] ?? r.status} · {r.employee.fullName}
              </>
            )}
            renderAction={(r) => {
              const key = (['confirm', 'checkIn', 'complete'] as const).find((a) =>
                r.availableActions.includes(a),
              );
              if (!key) return null;
              return (
                <Button
                  variant="secondary"
                  onClick={() => runQuickAction(r.id, key)}
                  loading={actionBusyId === r.id}
                >
                  {QUICK_ACTION[key].label}
                </Button>
              );
            }}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
