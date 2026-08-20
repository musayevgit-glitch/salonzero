import type { Prisma, PrismaClient } from '@salonomia/database';

/**
 * Notification types written by this app.
 *
 * The dotted lowercase types (`reservation.confirmed`, `reservation.cancelled_by_customer`, …)
 * predate the inbox and are still written by the booking routes; the inbox renders them too,
 * falling back to a translated label when the payload carries no `title`.
 */
export const NOTIFICATION_TYPE = {
  REMINDER_1H: 'REMINDER_1H',
  REMINDER_15M: 'REMINDER_15M',
  CANCELLED: 'CANCELLED',
} as const;

/** The two reminder types the cron owns. Rescheduling clears exactly these. */
export const REMINDER_TYPES: string[] = [
  NOTIFICATION_TYPE.REMINDER_1H,
  NOTIFICATION_TYPE.REMINDER_15M,
];

/**
 * Shape every notification this app writes puts in `payload`.
 *
 * Snapshots (salonName/serviceName/stylistName) are copied at write time on purpose: an inbox
 * entry should keep describing the appointment as it was, and rendering it must never require
 * joining back to rows that may since have been renamed or deactivated.
 */
export interface NotificationPayload {
  title: string;
  message: string;
  reservationId: string;
  salonName: string | null;
  serviceName: string | null;
  startAt: string;
  stylistName: string | null;
  reminderType?: '1h' | '15m';
  // Every value is a plain string or null, which is what makes this assignable to Prisma's
  // `InputJsonObject` without a cast — the index signature is the structural proof of that.
  [key: string]: string | null | undefined;
}

/** Narrow read of a reservation sufficient to build a payload. */
export interface ReservationForNotification {
  id: string;
  startAt: Date;
  salon: { name: string } | null;
  service: { name: string } | null;
  employee: { fullName: string } | null;
}

export const RESERVATION_NOTIFICATION_SELECT = {
  id: true,
  startAt: true,
  customerId: true,
  salon: { select: { name: true } },
  service: { select: { name: true } },
  employee: { select: { fullName: true } },
} as const;

export function buildNotificationPayload(
  reservation: ReservationForNotification,
  parts: { title: string; message: string; reminderType?: '1h' | '15m' },
): NotificationPayload {
  return {
    title: parts.title,
    message: parts.message,
    reservationId: reservation.id,
    salonName: reservation.salon?.name ?? null,
    serviceName: reservation.service?.name ?? null,
    startAt: reservation.startAt.toISOString(),
    stylistName: reservation.employee?.fullName ?? null,
    ...(parts.reminderType ? { reminderType: parts.reminderType } : {}),
  };
}

/** Minimal surface shared by `prisma` and a `$transaction` client. */
type NotificationDb = Pick<PrismaClient, 'notification'> | Prisma.TransactionClient;

/**
 * Drops any not-yet-read reminder rows for a reservation.
 *
 * Called when a reservation moves in time or leaves an active status. Reminders that the customer
 * has already read are left alone — deleting something they have seen would make the inbox appear
 * to rewrite its own history. The cron re-creates reminders for the new time on its next pass.
 */
export async function clearReservationReminders(
  db: NotificationDb,
  reservationId: string,
): Promise<void> {
  await db.notification.deleteMany({
    where: {
      type: { in: REMINDER_TYPES },
      readAt: null,
      payload: { path: ['reservationId'], equals: reservationId },
    },
  });
}
