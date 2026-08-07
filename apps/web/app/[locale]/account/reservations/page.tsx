import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchApiServer, ApiServerError } from '../../../../lib/fetch-api-server';
import { PageLayout } from '../../../_components/PageLayout';
import { formatMoney } from '../../../../lib/format-money';

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

const STATUS_MAP: Record<string, string> = {
  PENDING: 'Gözləmədə',
  CONFIRMED: 'Təsdiqlənmiş',
  CANCELLED_BY_CUSTOMER: 'Ləğv edilmiş',
  CANCELLED_BY_SALON: 'Salon tərəfindən ləğv',
  REJECTED: 'İmtina edilib',
  CHECKED_IN: 'Yoxlanılıb',
  COMPLETED: 'Tamamlanmış',
  NO_SHOW: 'Gəlməyib',
};

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

  const statuses = ['Hamısı', ...Object.keys(STATUS_MAP)];

  return (
    <PageLayout activeNav="reservations" isAuthenticated={true}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#1e1b2e', margin: 0 }}>Rezervasiyalarım</h1>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {statuses.map(s => {
            const isAll = s === 'Hamısı';
            const isActive = isAll ? !status : status === s;
            const href = isAll ? '?' : `?status=${s}`;
            return (
              <Link key={s} href={href} style={{
                padding: '0.5rem 1rem',
                borderRadius: 9999,
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                background: isActive ? '#7c3aed' : 'white',
                color: isActive ? 'white' : '#1e1b2e',
                border: isActive ? '1px solid #7c3aed' : '1px solid #e4d4f4',
                transition: 'all 0.2s',
              }}>
                {isAll ? 'Hamısı' : STATUS_MAP[s]}
              </Link>
            );
          })}
        </div>

        {data.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: '#7c6fa0' }}>Heç bir rezervasiya yoxdur.</p>
            <Link href="/salons" style={{ display: 'inline-block', marginTop: '1rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}>
              Salonları kəşf et
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.items.map((r) => {
              const bStyle = BADGE_STYLE[r.status] || { background: '#f3f4f6', color: '#4b5563' };
              const dateStr = new Intl.DateTimeFormat('az-AZ', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }).format(new Date(r.startAt));
              
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
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>Tarix və Saat</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e1b2e', fontWeight: 500 }}>{dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>Usta</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e1b2e', fontWeight: 500 }}>{r.employee?.fullName || 'İstənilən'}</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e4d4f4', margin: '0.5rem -1.25rem 0', padding: '1rem 1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1b2e' }}>
                      {formatMoney(r.priceAmount)}
                    </div>
                    <Link href={`/account/reservations/${r.id}`} style={{ color: '#7c3aed', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                      Ətraflı bax →
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
              <Link href={`?page=${page - 1}${status ? `&status=${status}` : ''}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>← Əvvəlki</Link>
            ) : <span />}
            <span style={{ color: '#7c6fa0' }}>Səhifə {page} / {totalPages}</span>
            {page < totalPages ? (
              <Link href={`?page=${page + 1}${status ? `&status=${status}` : ''}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>Növbəti →</Link>
            ) : <span />}
          </div>
        )}
      </div>
      <style>{`
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </PageLayout>
  );
}
