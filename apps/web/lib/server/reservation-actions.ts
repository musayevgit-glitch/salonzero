export type StaffReservationAction =
  'confirm' | 'reject' | 'reschedule' | 'cancel' | 'checkIn' | 'complete' | 'noShow';

export function computeStaffAvailableActions(
  status: string,
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
