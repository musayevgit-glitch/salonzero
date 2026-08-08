'use client';

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  ErrorState,
  FormField,
  Input,
  PermissionDeniedState,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  changedByUser: { fullName: string } | null;
}

interface ReservationDetail {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  customerNote: string | null;
  guestName: string | null;
  createdAt: string;
  service: { id: string; name: string };
  employee: { id: string; fullName: string };
  customer: { email: string } | null;
  availableActions: string[];
  statusHistory: StatusHistoryItem[];
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; reservation: ReservationDetail };

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

function formatMoney(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountMinorUnits / 100,
  );
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const { salonId, reservationId } = useParams<{ salonId: string; reservationId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEmployeeId, setRescheduleEmployeeId] = useState('');

  function load() {
    apiFetch<ReservationDetail>(`/salons/${salonId}/reservations/${reservationId}`)
      .then((reservation) => setState({ kind: 'ready', reservation }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/reservations/${reservationId}`);
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

  useEffect(load, [salonId, reservationId, router]);

  useEffect(() => {
    apiFetch<{ services: unknown[]; employees: { id: string; fullName: string }[] }>(
      `/salons/${salonId}/reservations/booking-options`,
    )
      .then((data) => setEmployees(data.employees))
      .catch(() => {
        /* non-fatal */
      });
  }, [salonId]);

  async function runAction(path: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await apiFetch(`/salons/${salonId}/reservations/${reservationId}/${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      showToast('Reservation updated.');
      setRejectOpen(false);
      setCancelOpen(false);
      setRescheduleOpen(false);
      setNoShowOpen(false);
      setReasonInput('');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast(
          err.message || 'This reservation changed since you last viewed it — refreshed.',
          'danger',
        );
        load();
      } else {
        showToast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
      }
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="p-8">
        <Skeleton className="h-64 w-full max-w-lg" />
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
        <ErrorState title="Couldn't load this reservation" description={state.message} />
      </main>
    );
  }

  const { reservation } = state;
  const actions = new Set(reservation.availableActions);

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: 'Reservations', href: `/salon/${salonId}/reservations` },
          { label: reservation.customer?.email ?? reservation.guestName ?? 'Reservation' },
        ]}
      />

      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">
            {reservation.customer?.email ?? reservation.guestName ?? 'Guest'}
          </h1>
          <Badge>{STATUS_LABEL[reservation.status] ?? reservation.status}</Badge>
        </div>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {reservation.customer ? (
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-text-secondary">Customer email</dt>
              <dd className="break-all">{reservation.customer.email}</dd>
            </div>
          ) : null}
          {reservation.guestName ? (
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-text-secondary">Guest name</dt>
              <dd>{reservation.guestName}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">Service</dt>
            <dd>{reservation.service.name}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">Stylist</dt>
            <dd>{reservation.employee.fullName}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">Time</dt>
            <dd>
              {new Date(reservation.startAt).toLocaleString()} –{' '}
              {new Date(reservation.endAt).toLocaleTimeString()}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">Price</dt>
            <dd>{formatMoney(reservation.priceAmount, reservation.currency)}</dd>
          </div>
          {reservation.customerNote ? (
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-text-secondary">Note</dt>
              <dd>{reservation.customerNote}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {actions.has('confirm') ? (
            <Button onClick={() => runAction('confirm')} loading={busy}>
              Confirm
            </Button>
          ) : null}
          {actions.has('reject') ? (
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          ) : null}
          {actions.has('reschedule') ? (
            <Button
              variant="secondary"
              onClick={() => {
                setRescheduleStart(toDatetimeLocalValue(reservation.startAt));
                setRescheduleEmployeeId(reservation.employee.id);
                setRescheduleOpen(true);
              }}
            >
              Reschedule
            </Button>
          ) : null}
          {actions.has('cancel') ? (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
          ) : null}
          {actions.has('checkIn') ? (
            <Button onClick={() => runAction('check-in')} loading={busy}>
              Check in
            </Button>
          ) : null}
          {actions.has('complete') ? (
            <Button onClick={() => runAction('complete')} loading={busy}>
              Complete
            </Button>
          ) : null}
          {actions.has('noShow') ? (
            <Button variant="destructive" onClick={() => setNoShowOpen(true)}>
              Mark no-show
            </Button>
          ) : null}
        </div>
      </Card>

      {/* ── Status history timeline ── */}
      {reservation.statusHistory && reservation.statusHistory.length > 0 ? (
        <Card className="max-w-lg">
          <h2 className="text-base font-semibold text-text-primary mb-4">Status history</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {reservation.statusHistory.map((entry, i) => (
              <li
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: '0.875rem',
                  paddingBottom: i < reservation.statusHistory.length - 1 ? '1rem' : 0,
                }}
              >
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '1rem' }}>
                  <div
                    style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      marginTop: '0.3125rem',
                      flexShrink: 0,
                    }}
                  />
                  {i < reservation.statusHistory.length - 1 ? (
                    <div
                      style={{
                        width: '1px',
                        flex: 1,
                        background: 'var(--color-border)',
                        marginTop: '0.25rem',
                      }}
                    />
                  ) : null}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {entry.fromStatus ? (
                      <span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {STATUS_LABEL[entry.fromStatus] ?? entry.fromStatus}
                        </span>
                        {' → '}
                      </span>
                    ) : null}
                    {STATUS_LABEL[entry.toStatus] ?? entry.toStatus}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                    {new Date(entry.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {entry.changedByUser ? ` · ${entry.changedByUser.fullName}` : ' · System'}
                  </p>
                  {entry.reason ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem', fontStyle: 'italic' }}>
                      "{entry.reason}"
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Dialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this reservation?"
        description="The customer will be notified. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => runAction('reject', { reason: reasonInput || undefined })}
            >
              Reject
            </Button>
          </>
        }
      >
        <FormField label="Reason" optional>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              rows={3}
            />
          )}
        </FormField>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this reservation?"
        description="The customer will be notified. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy}>
              Keep reservation
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => runAction('cancel', { reason: reasonInput || undefined })}
            >
              Cancel reservation
            </Button>
          </>
        }
      >
        <FormField label="Reason" optional>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              rows={3}
            />
          )}
        </FormField>
      </Dialog>

      <Dialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Reschedule this reservation"
        description="The new time is re-checked for availability before saving."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={() =>
                runAction('reschedule', {
                  startAt: new Date(rescheduleStart).toISOString(),
                  employeeId: rescheduleEmployeeId || undefined,
                })
              }
            >
              Save new time
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="New start time">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="datetime-local"
                value={rescheduleStart}
                onChange={(e) => setRescheduleStart(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Stylist">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={rescheduleEmployeeId}
                onChange={(e) => setRescheduleEmployeeId(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      </Dialog>

      <ConfirmDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        title="Mark as no-show?"
        description="The customer did not arrive for this appointment. This cannot be undone."
        confirmLabel="Mark no-show"
        destructive
        confirming={busy}
        onConfirm={() => runAction('no-show')}
      />
    </main>
  );
}
