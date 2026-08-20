'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { PageLayout } from '../../_components/PageLayout';
import Link from 'next/link';

interface ReservationItem {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  guestName: string | null;
  service: { id: string; name: string };
  customer: { email: string; fullName: string | null } | null;
}

interface OverviewData {
  salonId: string;
  salonName: string;
  employeeId: string;
  todayReservations: ReservationItem[];
  upcomingReservations: ReservationItem[];
  monthTotal: number;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('az-AZ', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(new Date(iso));
}

function guestLabel(r: ReservationItem) {
  return r.customer?.fullName || r.guestName || r.customer?.email || 'Müştəri';
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  CHECKED_IN: 'Qəbul edildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'Ləğv edildi',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#7c3aed',
  CHECKED_IN: '#059669',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444',
};

function ReservationRow({ r }: { r: ReservationItem }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid #f3e8ff',
      }}
    >
      <div
        style={{
          minWidth: 52,
          textAlign: 'center',
          background: '#f5f0ff',
          borderRadius: 10,
          padding: '0.35rem 0.5rem',
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed' }}>
          {formatTime(r.startAt)}
        </p>
        <p style={{ margin: 0, fontSize: '0.65rem', color: '#9d92bd' }}>
          {formatTime(r.endAt)}
        </p>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#1e1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {guestLabel(r)}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#7c6fa0' }}>{r.service.name}</p>
      </div>
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: STATUS_COLOR[r.status] ?? '#6b7280',
          background: `${STATUS_COLOR[r.status] ?? '#6b7280'}18`,
          borderRadius: 999,
          padding: '0.2rem 0.6rem',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABEL[r.status] ?? r.status}
      </span>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e4d4f4',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(30,27,46,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #f3e8ff' }}>
      <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e1b2e' }}>{title}</h2>
      {sub && <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#7c6fa0' }}>{sub}</p>}
    </div>
  );
}

export default function StilistadminPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OverviewData>('/stilistadmin/overview')
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/stilistadmin');
        } else if (err instanceof ApiError && err.status === 403) {
          router.replace('/account');
        } else {
          setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
          setLoading(false);
        }
      });
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf5ff',
        }}
      >
        <p style={{ color: '#7c6fa0', fontSize: '0.95rem' }}>Yüklənir...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageLayout activeNav="account" isAuthenticated>
        <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
          <p style={{ color: '#ef4444' }}>{error ?? 'Məlumat tapılmadı.'}</p>
        </div>
      </PageLayout>
    );
  }

  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat('az-AZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);

  // Group upcoming by date
  const grouped: Record<string, ReservationItem[]> = {};
  for (const r of data.upcomingReservations) {
    const key = formatDate(r.startAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  return (
    <PageLayout activeNav="account" isAuthenticated>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa' }}>
            Stilist paneli
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 700,
              color: '#1e1b2e',
              margin: '0 0 0.25rem',
            }}
          >
            {data.salonName}
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#7c6fa0' }}>{todayLabel}</p>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'Bu gün', value: data.todayReservations.length, color: '#7c3aed' },
            { label: 'Növbəti 7 gün', value: data.upcomingReservations.length, color: '#059669' },
            { label: 'Bu ay', value: data.monthTotal, color: '#f59e0b' },
          ].map((stat) => (
            <Card key={stat.label}>
              <div style={{ padding: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#9d92bd' }}>
                  {stat.label}
                </p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#7c6fa0' }}>rezervasiya</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Today's schedule */}
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr' }}>
          <Card>
            <CardHeader title="Bu günün cədvəli" sub={todayLabel} />
            {data.todayReservations.length === 0 ? (
              <p style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9d92bd', fontSize: '0.88rem', margin: 0 }}>
                Bu gün rezervasiya yoxdur.
              </p>
            ) : (
              data.todayReservations.map((r) => <ReservationRow key={r.id} r={r} />)
            )}
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader title="Növbəti 7 günün rezervasiyaları" />
            {Object.keys(grouped).length === 0 ? (
              <p style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9d92bd', fontSize: '0.88rem', margin: 0 }}>
                Gələcək rezervasiya yoxdur.
              </p>
            ) : (
              Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <p
                    style={{
                      margin: 0,
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#a78bfa',
                      background: '#faf5ff',
                      borderBottom: '1px solid #f3e8ff',
                    }}
                  >
                    {date}
                  </p>
                  {items.map((r) => <ReservationRow key={r.id} r={r} />)}
                </div>
              ))
            )}
          </Card>

          {/* Link to full salon view (read-only context) */}
          <div style={{ textAlign: 'center' }}>
            <Link
              href={`/salon/${data.salonId}/reservations`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#7c3aed',
                textDecoration: 'none',
              }}
            >
              Bütün salon rezervasiyalarına bax →
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
