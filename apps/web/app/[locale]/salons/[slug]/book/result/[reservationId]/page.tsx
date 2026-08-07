import { notFound, redirect } from 'next/navigation';
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

const AZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
const AZ_WEEKDAYS_SHORT = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz'];

function formatDateTimeAz(iso: string, timezone: string) {
  const d = new Date(iso);
  // Convert date parts using timeZone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  try {
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    const day = getPart('day');
    const monthIndex = parseInt(getPart('month')) - 1;
    const year = getPart('year');
    const hour = getPart('hour').padStart(2, '0');
    const minute = getPart('minute').padStart(2, '0');
    
    // get weekday
    const utcDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }));
    const weekdayIdx = (utcDate.getDay() + 6) % 7; // Monday = 0
    
    return `${day} ${AZ_MONTHS_SHORT[monthIndex]} ${year}, ${AZ_WEEKDAYS_SHORT[weekdayIdx]} saat ${hour}:${minute}`;
  } catch {
    return new Intl.DateTimeFormat('az-AZ', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }
}

import { formatMoney } from '../../../../../../../lib/format-money';

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
          border: '1px solid #ede5dc', 
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(26,18,8,0.03)'
        }}
      >
        {/* Success Icon */}
        <div 
          style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: isPending ? 'rgba(201, 164, 96, 0.12)' : 'rgba(76, 175, 80, 0.12)', 
            color: isPending ? '#c9a460' : '#4caf50',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem auto',
            fontSize: '2rem'
          }}
        >
          {isPending ? '🕐' : '✓'}
        </div>

        <h1 
          style={{ 
            fontFamily: "'Playfair Display', Georgia, serif", 
            fontSize: '1.75rem', 
            fontWeight: 700, 
            color: '#1a1208',
            margin: '0 0 0.5rem 0'
          }}
        >
          {isPending ? 'Rezervasiya qəbul edildi!' : 'Rezervasiya təsdiqləndi!'}
        </h1>
        
        <p style={{ fontSize: '0.9rem', color: '#9a8878', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
          {isPending
            ? `Rezervasiya sorğunuz ${reservation.salon.name} salonuna göndərildi. Salon təsdiqlədikdə sizə bildiriş göndəriləcək.`
            : `${reservation.salon.name} salonundakı görüşünüz uğurla təsdiqləndi.`}
        </p>

        {/* Details Card */}
        <div 
          style={{ 
            background: '#f9f6f3',
            borderRadius: 16,
            border: '1px solid #ede5dc', 
            padding: '1.25rem 1.5rem', 
            textAlign: 'left',
            marginBottom: '2rem'
          }}
        >
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#1a1208', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #ede5dc', paddingBottom: '0.5rem' }}>
            Rezervasiya məlumatları
          </p>
          
          <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#9a8878' }}>Salon</dt>
              <dd style={{ fontWeight: 600, color: '#1a1208', textAlign: 'right' }}>{reservation.salon.name}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#9a8878' }}>Xidmət</dt>
              <dd style={{ fontWeight: 600, color: '#1a1208', textAlign: 'right' }}>{reservation.service.name}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#9a8878' }}>Stilist</dt>
              <dd style={{ fontWeight: 600, color: '#1a1208', textAlign: 'right' }}>{reservation.employee?.fullName ?? 'İstənilən stilist'}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <dt style={{ color: '#9a8878' }}>Tarix və Saat</dt>
              <dd style={{ fontWeight: 600, color: '#1a1208', textAlign: 'right' }}>{formatDateTimeAz(reservation.startAt, reservation.salon.timezone)}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderTop: '1px dashed #ede5dc', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <dt style={{ color: '#9a8878', fontWeight: 600 }}>Ödəniləcək məbləğ</dt>
              <dd style={{ fontWeight: 700, color: '#c9a460', fontSize: '1.05rem', textAlign: 'right' }}>{formatMoney(reservation.priceAmount)}</dd>
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
              background: '#5c3d28',
              color: 'white',
              borderRadius: 12,
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(92,61,40,0.2)',
              transition: 'opacity 0.2s'
            }}
          >
            Rezervasiyalarıma keç
          </Link>
          
          <Link
            href={`/salons/${slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: '#9a8878',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
          >
            Salona geri qayıt
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
