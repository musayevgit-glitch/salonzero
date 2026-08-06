import { PublicShell } from '@salonomia/ui';
import { notFound, redirect } from 'next/navigation';
import { fetchApiServer, ApiServerError } from '../../../../../../lib/fetch-api-server';
import Link from 'next/link';

interface ReservationResult {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  service: { name: string; durationMinutes: number };
  employee: { fullName: string } | null;
  salon: { name: string; slug: string; timezone: string };
}

function formatDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso));
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string; reservationId: string }>;
}) {
  const { slug, reservationId } = await params;

  let reservation: ReservationResult;
  try {
    reservation = await fetchApiServer<ReservationResult>(
      `/customer/reservations/${reservationId}`,
      { cache: 'no-store' },
    );
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 401) {
      redirect(
        `/login?returnTo=${encodeURIComponent(`/salons/${slug}/book/result/${reservationId}`)}`,
      );
    }
    notFound();
  }

  const isPending = reservation.status === 'PENDING';

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl text-center">
        <div className="mt-8 text-5xl" aria-hidden="true">
          {isPending ? '🕐' : '✅'}
        </div>

        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          {isPending ? 'Booking received!' : 'Booking confirmed!'}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {isPending
            ? `Your request has been sent to ${reservation.salon.name}. You'll be notified once they confirm.`
            : `Your appointment at ${reservation.salon.name} is confirmed.`}
        </p>

        <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-5 text-left text-sm">
          <dl className="flex flex-col gap-3">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Service</dt>
              <dd className="text-right font-medium text-text-primary">{reservation.service.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Stylist</dt>
              <dd className="text-right text-text-primary">
                {reservation.employee?.fullName ?? 'Any available stylist'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Date &amp; time</dt>
              <dd className="text-right text-text-primary">
                {formatDateTime(reservation.startAt, reservation.salon.timezone)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Price</dt>
              <dd className="text-right font-semibold text-text-primary">
                {formatMoney(reservation.priceAmount, reservation.currency)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/account/reservations"
            className="inline-flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View my bookings
          </Link>
          <Link
            href={`/salons/${slug}`}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Back to salon
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
