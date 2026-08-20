import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchApiServer, ApiServerError } from '../../../../lib/fetch-api-server';
import { PageLayout } from '../../../_components/PageLayout';
import { RatingPrompt } from '../../../_components/RatingPrompt';
import { formatMoney } from '../../../../lib/format-money';
import { formatLongDateTime } from '../../../../lib/format-date';
import { ReservationStatusFilter, ALL_STATUSES } from './ReservationStatusFilter';

export const dynamic = 'force-dynamic';

interface ReservationListItem {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  service: { name: string; durationMinutes: number };
  employee: { fullName: string } | null;
  salon: { name: string; slug: string };
}

interface ReservationList {
  items: ReservationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  PENDING: { background: '#fef3c7', color: '#92400e' },
  CONFIRMED: { background: '#dcfce7', color: '#166534' },
  CANCELLED_BY_CUSTOMER: { background: '#f3f4f6', color: '#4b5563' },
  CANCELLED_BY_SALON: { background: '#f3f4f6', color: '#4b5563' },
  REJECTED: { background: '#fee2e2', color: '#b91c1c' },
  CHECKED_IN: { background: '#dbeafe', color: '#1e40af' },
  COMPLETED: { background: '#f3e8ff', color: '#6b21a8' },
  NO_SHOW: { background: '#f3f4f6', color: '#4b5563' },
};

export default async function ReservationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const t = await getTranslations('account');
  const tb = await getTranslations('booking');
  const locale = await getLocale();

  const STATUS_MAP: Record<string, string> = {
    PENDING: t('statusPending'),
    CONFIRMED: t('statusConfirmed'),
    CANCELLED_BY_CUSTOMER: t('statusCancelledByCustomer'),
    CANCELLED_BY_SALON: t('statusCancelledBySalon'),
    CHECKED_IN: t('statusCheckedIn'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
    REJECTED: t('statusRejected'),
  };

  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  let data: ReservationList;
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    data = await fetchApiServer<ReservationList>(`/customer/reservations?${params}`, {
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 401) {
      redirect('/login?returnTo=/account/reservations');
    }
    if (err instanceof ApiServerError && err.status === 403) {
      redirect('/login?returnTo=/account/reservations');
    }
    notFound();
  }

  const totalPages = Math.ceil(data.total / data.pageSize);

  const statusOptions = [
    { value: ALL_STATUSES, label: t('statusAll') },
    ...Object.entries(STATUS_MAP).map(([value, label]) => ({ value, label })),
  ];

  return (
    <PageLayout activeNav="reservations" isAuthenticated={true}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#1e1b2e', margin: 0 }}>{t('reservationsTitle')}</h1>

        {/* Status filter — a dropdown so it scales as statuses are added */}
        <ReservationStatusFilter
          value={status && STATUS_MAP[status] ? status : ALL_STATUSES}
          label={t('statusFilterLabel')}
          options={statusOptions}
        />

        {data.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: '#7c6fa0' }}>{t('noReservations')}</p>
            <Link href="/salons" style={{ display: 'inline-block', marginTop: '1rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}>
              {t('discoverSalons')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.items.map((r) => {
              const bStyle = BADGE_STYLE[r.status] || { background: '#f3f4f6', color: '#4b5563' };
              const dateStr = formatLongDateTime(r.startAt, locale);
              
              return (
                <div key={r.id} style={{
                  background: 'white',
                  border: '1px solid #e4d4f4',
                  borderRadius: 14,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e1b2e', fontSize: '1.05rem' }}>{r.salon.name}</div>
                      <div style={{ color: '#6b5d8a', fontSize: '0.9rem', marginTop: '0.2rem' }}>{r.service.name}</div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: 9999,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      ...bStyle
                    }}>
                      {STATUS_MAP[r.status] || r.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>{tb('date')} &amp; {tb('time')}</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e1b2e', fontWeight: 500 }}>{dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>{tb('stylist')}</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e1b2e', fontWeight: 500 }}>{r.employee?.fullName || tb('anyStylist')}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e4d4f4', margin: '0.5rem -1.25rem 0', padding: '1rem 1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1b2e' }}>
                      {formatMoney(r.priceAmount)}
                    </div>
                    <Link href={`/account/reservations/${r.id}`} style={{ color: '#7c3aed', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                      {t('viewDetails')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
            {page > 1 ? (
              <Link href={`?page=${page - 1}${status ? `&status=${status}` : ''}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>{t('prevPage')}</Link>
            ) : <span />}
            <span style={{ color: '#7c6fa0' }}>{t('pageOf', { current: page, total: totalPages })}</span>
            {page < totalPages ? (
              <Link href={`?page=${page + 1}${status ? `&status=${status}` : ''}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>{t('nextPage')}</Link>
            ) : <span />}
          </div>
        )}
      </div>

      {/* Asks the server for this customer's own unrated completed visits; renders nothing
          when there are none or when the prompt was dismissed earlier this session. */}
      <RatingPrompt />
    </PageLayout>
  );
}
