import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import {
  NOTIFICATION_TYPE,
  REMINDER_TYPES,
  RESERVATION_NOTIFICATION_SELECT,
  buildNotificationPayload,
  type NotificationPayload,
} from '../../../../lib/server/notifications';

// Reminder timing must be evaluated against the real clock on every invocation.
export const dynamic = 'force-dynamic';

/**
 * Reservation reminders, invoked once a minute by Vercel Cron (see vercel.json).
 *
 * Each pass looks a little wider than one minute (±1 minute around the T-1h and T-15m marks) so a
 * skipped or slightly late invocation still catches the reservation; the duplicate protection
 * below is what makes that overlap safe.
 *
 * Duplicate protection uses `Notification.scheduledAt`, which is stamped with the reservation's
 * own start time. Existing reminder rows are looked up over the same bounded, indexed window as
 * the candidate reservations, so "already reminded" is a set membership test rather than a
 * per-reservation query.
 */

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

/** Half-width of the match window around each reminder mark. */
const TOLERANCE_MS = 60_000;

const MARKS = [
  { type: NOTIFICATION_TYPE.REMINDER_1H, offsetMs: 60 * 60_000, reminderType: '1h' as const },
  { type: NOTIFICATION_TYPE.REMINDER_15M, offsetMs: 15 * 60_000, reminderType: '15m' as const },
];

/**
 * Reminder copy is written at creation time and stored in the payload, because a cron job has no
 * request locale. Azerbaijani is the platform's default locale; the inbox prefers its own
 * translation for a known `type` and only falls back to this text.
 */
function reminderCopy(
  reminderType: '1h' | '15m',
  salonName: string | null,
): { title: string; message: string } {
  const where = salonName ? ` — ${salonName}` : '';
  return reminderType === '1h'
    ? {
        title: `Rezervasiyanıza 1 saat qalıb${where}`,
        message: 'Görüşünüzə 1 saat qalıb. Vaxtında gəlməyi unutmayın.',
      }
    : { title: `Rezervasiyanıza 15 dəqiqə qalıb${where}`, message: 'Görüşünüzə 15 dəqiqə qalıb.' };
}

function unauthorizedCron(): NextResponse {
  return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Deny by default: with no secret configured the endpoint is closed, never open.
  if (!secret) return unauthorizedCron();

  const header = req.headers.get('authorization');
  if (header !== `Bearer ${secret}`) return unauthorizedCron();

  const now = new Date();

  // One query covers both marks: the union of the two windows, widened by the tolerance.
  const windowStart = new Date(now.getTime() + 15 * 60_000 - TOLERANCE_MS);
  const windowEnd = new Date(now.getTime() + 60 * 60_000 + TOLERANCE_MS);

  const [candidates, existing] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        startAt: { gte: windowStart, lte: windowEnd },
      },
      select: RESERVATION_NOTIFICATION_SELECT,
    }),
    prisma.notification.findMany({
      where: {
        type: { in: REMINDER_TYPES },
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
      select: { type: true, payload: true },
    }),
  ]);

  const alreadySent = new Set(
    existing
      .map((n) => {
        const reservationId = (n.payload as NotificationPayload | null)?.reservationId;
        return reservationId ? `${n.type}:${reservationId}` : null;
      })
      .filter((k): k is string => k !== null),
  );

  const rows: {
    userId: string;
    type: string;
    payload: NotificationPayload;
    scheduledAt: Date;
  }[] = [];

  for (const reservation of candidates) {
    const msUntilStart = reservation.startAt.getTime() - now.getTime();

    for (const mark of MARKS) {
      if (Math.abs(msUntilStart - mark.offsetMs) > TOLERANCE_MS) continue;
      if (alreadySent.has(`${mark.type}:${reservation.id}`)) continue;

      const copy = reminderCopy(mark.reminderType, reservation.salon?.name ?? null);
      rows.push({
        userId: reservation.customerId,
        type: mark.type,
        payload: buildNotificationPayload(reservation, {
          ...copy,
          reminderType: mark.reminderType,
        }),
        scheduledAt: reservation.startAt,
      });
      // Guards against a second pass within the same invocation.
      alreadySent.add(`${mark.type}:${reservation.id}`);
    }
  }

  if (rows.length > 0) {
    await prisma.notification.createMany({ data: rows });
  }

  // Counts only — reminder contents are personal data and are never logged or echoed here.
  return NextResponse.json({
    ok: true,
    scanned: candidates.length,
    created: rows.length,
    at: now.toISOString(),
  });
}
