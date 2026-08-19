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
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('salonAdmin');
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
      showToast(t('reservations.updated'));
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
      <main className="dashboard-page">
        <Skeleton className="h-64 w-full max-w-lg" />
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
        <ErrorState title={t('reservations.errorLoadOne')} description={state.message} />
      </main>
    );
  }

  const { reservation } = state;
  const actions = new Set(reservation.availableActions);

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: t('reservations.title'), href: `/salon/${salonId}/reservations` },
          { label: reservation.customer?.email ?? reservation.guestName ?? t('reservations.title') },
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
              <dt className="text-text-secondary">{t('reservations.customerEmail')}</dt>
              <dd className="break-all">{reservation.customer.email}</dd>
            </div>
          ) : null}
          {reservation.guestName ? (
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-text-secondary">{t('reservations.guestName')}</dt>
              <dd>{reservation.guestName}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">{t('reservations.service')}</dt>
            <dd>{reservation.service.name}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">{t('reservations.stylist')}</dt>
            <dd>{reservation.employee.fullName}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">{t('reservations.time')}</dt>
            <dd>
              {new Date(reservation.startAt).toLocaleString()} –{' '}
              {new Date(reservation.endAt).toLocaleTimeString()}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt className="text-text-secondary">{t('reservations.price')}</dt>
            <dd>{formatMoney(reservation.priceAmount, reservation.currency)}</dd>
          </div>
          {reservation.customerNote ? (
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-text-secondary">{t('reservations.noteLabel')}</dt>
              <dd>{reservation.customerNote}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {actions.has('confirm') ? (
            <Button onClick={() => runAction('confirm')} loading={busy}>
              {t('reservations.actionConfirm')}
            </Button>
          ) : null}
          {actions.has('reject') ? (
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>
              {t('reservations.actionReject')}
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
              {t('reservations.actionReschedule')}
            </Button>
          ) : null}
          {actions.has('cancel') ? (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              {t('reservations.actionCancel')}
            </Button>
          ) : null}
          {actions.has('checkIn') ? (
            <Button onClick={() => runAction('check-in')} loading={busy}>
              {t('reservations.actionCheckIn')}
            </Button>
          ) : null}
          {actions.has('complete') ? (
            <Button onClick={() => runAction('complete')} loading={busy}>
              {t('reservations.actionComplete')}
            </Button>
          ) : null}
          {actions.has('noShow') ? (
            <Button variant="destructive" onClick={() => setNoShowOpen(true)}>
              {t('reservations.actionMarkNoShow')}
            </Button>
          ) : null}
        </div>
      </Card>

      {/* ── Status history timeline ── */}
      {reservation.statusHistory && reservation.statusHistory.length > 0 ? (
        <Card className="max-w-lg">
          <h2 className="text-base font-semibold text-text-primary mb-4">{t('reservations.statusHistory')}</h2>
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
                    {entry.changedByUser ? ` · ${entry.changedByUser.fullName}` : ` · ${t('reservations.system')}`}
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
        title={t('reservations.rejectTitle')}
        description={t('reservations.rejectDesc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => runAction('reject', { reason: reasonInput || undefined })}
            >
              {t('reservations.actionReject')}
            </Button>
          </>
        }
      >
        <FormField label={t('reservations.reasonLabel')} optional>
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
        title={t('reservations.cancelTitle')}
        description={t('reservations.cancelDesc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy}>
              {t('reservations.keepReservation')}
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => runAction('cancel', { reason: reasonInput || undefined })}
            >
              {t('reservations.cancelReservation')}
            </Button>
          </>
        }
      >
        <FormField label={t('reservations.reasonLabel')} optional>
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
        title={t('reservations.rescheduleTitle')}
        description={t('reservations.rescheduleDesc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={busy}>
              {t('common.cancel')}
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
              {t('reservations.saveNewTime')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('reservations.newStartTime')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="datetime-local"
                value={rescheduleStart}
                onChange={(e) => setRescheduleStart(e.target.value)}
              />
            )}
          </FormField>
          <FormField label={t('reservations.stylist')}>
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
        title={t('reservations.noShowTitle')}
        description={t('reservations.noShowDesc')}
        confirmLabel={t('reservations.actionMarkNoShow')}
        destructive
        confirming={busy}
        onConfirm={() => runAction('no-show')}
      />
    </main>
  );
}
