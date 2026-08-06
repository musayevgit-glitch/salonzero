import type { ReservationStatus } from '@salonomia/database';

// Server-computed, per docs/architecture/reservation-state-machine.md — the dashboard must never
// re-derive which actions are legal from the status alone (e.g. it can't know `now` vs `endAt`
// without trusting the client's clock). Only staff actions are covered here; the customer-facing
// surface has its own (simpler) cancel/reschedule-window logic in transitions.service.ts.
export type StaffReservationAction =
  'confirm' | 'reject' | 'reschedule' | 'cancel' | 'checkIn' | 'complete' | 'noShow';

export function computeStaffAvailableActions(
  status: ReservationStatus,
  endAt: Date,
  now: Date,
): StaffReservationAction[] {
  switch (status) {
    case 'PENDING':
      return ['confirm', 'reject', 'reschedule', 'cancel'];
    case 'CONFIRMED': {
      const actions: StaffReservationAction[] = ['reschedule', 'cancel', 'checkIn'];
      if (now.getTime() > endAt.getTime()) actions.push('noShow');
      return actions;
    }
    case 'CHECKED_IN':
      return ['complete'];
    default:
      return [];
  }
}
