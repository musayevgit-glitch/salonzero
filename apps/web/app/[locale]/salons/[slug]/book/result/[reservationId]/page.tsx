import { notFound, redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchApiServer, ApiServerError } from '../../../../../../../lib/fetch-api-server';
import Link from 'next/link';
import { PageLayout } from '../../../../../../_components/PageLayout';

export const dynamic = 'force-dynamic';

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

function formatDateTimeLocale(iso: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

import { formatMoney } from '../../../../../../../lib/format-money';

export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string; reservationId: string }>;
}) {
  const { slug, reservationId } = await params;
  const t = await getTranslations('booking');
  const locale = await getLocale();

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

  const isAuthenticated = true;
  const isPending = reservation.status === 'PENDING';

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="reservations">
      <div
        style={{
          maxWidth: 550,
          margin: '3rem auto 5rem auto',
          background: 'white',
          borderRadius: 24,
          border: '1px solid #e4d4f4',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(30,27,46,0.03)',
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isPending ? 'rgba(201, 164, 96, 0.12)' : 'rgba(76, 175, 80, 0.12)',
            color: isPending ? '#7c3aed' : '#4caf50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            fontSize: '2rem',
          }}
        >
          {isPending ? '🕐' : '✓'}
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#1e1b2e',
            margin: '0 0 0.5rem 0',
          }}
        >
          {isPending ? t('successTitle') : t('successTitleConfirmed')}
        </h1>

        <p style={{ fontSize: '0.9rem', color: '#7c6fa0', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
          {isPending
            ? t('successPendingMsg', { salonName: reservation.salon.name })
            : t('successConfirmedMsg', { salonName: reservation.salon.name })}
        </p>

        {/* Details Card */}
        <div
          style={{
            background: '#f9f6f3',
            borderRadius: 16,
            border: '1px solid #e4d4f4',
            padding: '1.25rem 1.5rem',
            textAlign: 'left',
            marginBottom: '2rem',
          }}
        >
          <p
            style={{
              margin: '0 0 1rem 0',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#1e1b2e',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid #e4d4f4',
              paddingBottom: '0.5rem',
            }}
          >
            {t('bookingDetails')}
          </p>

          <dl
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.88rem',
              margin: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#7c6fa0' }}>{t('salon')}</dt>
              <dd style={{ fontWeight: 600, color: '#1e1b2e', textAlign: 'right' }}>
                {reservation.salon.name}
              </dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#7c6fa0' }}>{t('serviceName')}</dt>
              <dd style={{ fontWeight: 600, color: '#1e1b2e', textAlign: 'right' }}>
                {reservation.service.name}
              </dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#7c6fa0' }}>{t('stylist')}</dt>
              <dd style={{ fontWeight: 600, color: '#1e1b2e', textAlign: 'right' }}>
                {reservation.employee?.fullName ?? t('anyStylist')}
              </dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#7c6fa0' }}>
                {t('date')}/{t('time')}
              </dt>
              <dd style={{ fontWeight: 600, color: '#1e1b2e', textAlign: 'right' }}>
                {formatDateTimeLocale(reservation.startAt, reservation.salon.timezone, locale)}
              </dd>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                borderTop: '1px dashed #e4d4f4',
                paddingTop: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              <dt style={{ color: '#7c6fa0', fontWeight: 600 }}>{t('amountToPay')}</dt>
              <dd
                style={{
                  fontWeight: 700,
                  color: '#7c3aed',
                  fontSize: '1.05rem',
                  textAlign: 'right',
                }}
              >
                {formatMoney(reservation.priceAmount)}
              </dd>
            </div>
          </dl>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <Link
            href="/account/reservations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0.9rem',
              background: '#7c3aed',
              color: 'white',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(92,61,40,0.2)',
              transition: 'opacity 0.2s',
            }}
          >
            {t('viewMyBookings')}
          </Link>

          <Link
            href={`/salons/${slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: '#7c6fa0',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
          >
            {t('backToSalon')}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
