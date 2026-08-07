import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getIsAuthenticated } from '../../../lib/fetch-api-server';
import { fetchPublicApi, PublicApiError } from '../../../lib/public-api';
import { PageLayout } from '../../_components/PageLayout';
import { StylistCard } from './StylistCard';

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
}

interface SalonDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  genderFocus: string | null;
  bookingPolicySummary: {
    autoConfirm: boolean;
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
  } | null;
  approximateOpeningHours: { weekday: number; startMinuteOfDay: number; endMinuteOfDay: number }[];
  serviceCategories: { id: string; name: string; services: PublicService[] }[];
  uncategorizedServices: PublicService[];
  employees: {
    id: string;
    fullName: string;
    bio: string | null;
    portfolio: { id: string; imageUrl: string; caption: string | null }[];
  }[];
}

const GENDER_FOCUS_LABEL: Record<string, string> = {
  WOMEN: 'Qadınlar',
  MEN: 'Kişilər',
  UNISEX: 'Uniseks',
};

const WEEKDAY_LABEL = [
  'Bazar',
  'Bazar ertəsi',
  'Çərşənbə axşamı',
  'Çərşənbə',
  'Cümə axşamı',
  'Cümə',
  'Şənbə',
];

function formatMinuteOfDay(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

import { formatMoney } from '../../../lib/format-money';

async function loadSalon(slug: string): Promise<SalonDetail | null> {
  try {
    return await fetchPublicApi<SalonDetail>(`/public/salons/${slug}`);
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return { title: 'Salon not found — Salonomia' };
  return {
    title: `${salon.name} — Salonomia`,
    description: salon.description ?? `Book an appointment at ${salon.name}.`,
  };
}

export default async function SalonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [isAuthenticated, salonResult] = await Promise.all([
    getIsAuthenticated(),
    loadSalon(slug).catch((err) => err as Error),
  ]);

  if (salonResult instanceof Error) {
    return (
      <PageLayout isAuthenticated={isAuthenticated}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#1a1208', marginBottom: '0.5rem' }}>Couldn't load this salon</h1>
          <p style={{ color: '#9a8878' }}>
            {salonResult instanceof PublicApiError ? salonResult.message : 'Something went wrong.'}
          </p>
        </div>
      </PageLayout>
    );
  }

  const salon = salonResult;
  if (!salon) notFound();

  const hasServices = salon.serviceCategories.length > 0 || salon.uncategorizedServices.length > 0;

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="salons">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Hero Section */}
        <div style={{ 
          position: 'relative', 
          height: 280, 
          overflow: 'hidden',
        }} className="hero-container">
          <img src="/images/salon-1.png" alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,18,8,0.9), rgba(26,18,8,0.2))' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: 'white', margin: 0 }}>
              {salon.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {salon.city && <span style={{ color: '#ede5dc', fontSize: '0.875rem' }}>{salon.city}</span>}
              {salon.genderFocus && (
                <span style={{ background: '#c9a460', color: '#1a1208', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
                  {GENDER_FOCUS_LABEL[salon.genderFocus] ?? salon.genderFocus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="lg-grid">
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {salon.description && (
              <section style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', marginBottom: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Haqqında</h2>
                <p style={{ color: '#6b5e4a', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{salon.description}</p>
              </section>
            )}

            <section style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', marginBottom: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Xidmətlər</h2>
              {hasServices ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {salon.serviceCategories.map((category) => (
                    <div key={category.id}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1208', margin: '0 0 0.5rem 0' }}>{category.name}</h3>
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                        {category.services.map((s, idx) => (
                          <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: idx < category.services.length - 1 ? '1px solid #ede5dc' : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ color: '#1a1208', fontWeight: 500 }}>{s.name}</span>
                              <span style={{ color: '#9a8878', fontSize: '0.85rem' }}>{s.durationMinutes} dəq</span>
                            </div>
                            <span style={{ color: '#1a1208', fontWeight: 600 }}>{formatMoney(s.priceAmount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {salon.uncategorizedServices.length > 0 && (
                    <div>
                      {salon.serviceCategories.length > 0 && <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1208', margin: '0 0 0.5rem 0' }}>Digər xidmətlər</h3>}
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                        {salon.uncategorizedServices.map((s, idx) => (
                          <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: idx < salon.uncategorizedServices.length - 1 ? '1px solid #ede5dc' : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ color: '#1a1208', fontWeight: 500 }}>{s.name}</span>
                              <span style={{ color: '#9a8878', fontSize: '0.85rem' }}>{s.durationMinutes} dəq</span>
                            </div>
                            <span style={{ color: '#1a1208', fontWeight: 600 }}>{formatMoney(s.priceAmount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: '#9a8878', fontSize: '0.95rem', margin: 0 }}>Hələ xidmət əlavə edilməyib.</p>
              )}
            </section>

            <section style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', marginBottom: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Ustalar</h2>
              {salon.employees.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {salon.employees.map(employee => (
                    <StylistCard
                      key={employee.id}
                      employee={employee}
                      salonName={salon.name}
                      salonSlug={salon.slug}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9a8878', fontSize: '0.95rem', margin: 0 }}>Hələ usta əlavə edilməyib.</p>
              )}
            </section>

            {salon.approximateOpeningHours.length > 0 && (
              <section style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', marginBottom: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>İş saatları</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {salon.approximateOpeningHours.map(h => (
                    <div key={h.weekday} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f5f0eb' }}>
                      <span style={{ color: '#6b5e4a', fontWeight: 500 }}>{WEEKDAY_LABEL[h.weekday]}</span>
                      <span style={{ color: '#1a1208', fontWeight: 600 }}>{formatMinuteOfDay(h.startMinuteOfDay)} – {formatMinuteOfDay(h.endMinuteOfDay)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {salon.bookingPolicySummary && (
              <section style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', marginBottom: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Rezervasiya qaydaları</h2>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#6b5e4a', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <li>{salon.bookingPolicySummary.autoConfirm ? 'Rezervasiyalar anında təsdiqlənir.' : 'Rezervasiyalar üçün salonun təsdiqi tələb olunur.'}</li>
                  <li>Təyinatdan {salon.bookingPolicySummary.cancellationWindowHours} saat əvvələ qədər ləğv etmək mümkündür.</li>
                  <li>Təyinatdan {salon.bookingPolicySummary.rescheduleWindowHours} saat əvvələ qədər vaxtı dəyişmək mümkündür.</li>
                </ul>
              </section>
            )}

          </div>

          <div className="booking-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="booking-card" style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem', position: 'sticky', top: '5.5rem' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem', color: '#1a1208', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Rezervasiya</h2>
              <p style={{ color: '#6b5e4a', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: 0 }}>Uyğun vaxtı seçmək üçün davam edin.</p>
              <a href={`/salons/${salon.slug}/book/service`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, background: '#5c3d28', color: 'white', borderRadius: 14, textDecoration: 'none', fontWeight: 500, fontSize: '1rem' }}>
                Rezervasiya et
              </a>
            </div>
          </div>

        </div>

        {/* Mobile Sticky Button */}
        <div className="mobile-book-btn" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #ede5dc', zIndex: 100 }}>
          <a href={`/salons/${salon.slug}/book/service`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, background: '#1a1208', color: 'white', borderRadius: 14, textDecoration: 'none', fontWeight: 500, fontSize: '1rem' }}>
            Rezervasiya et
          </a>
        </div>
      </div>
      <style>{`
        .hero-container { margin-left: -1.25rem; margin-right: -1.25rem; margin-top: -1.5rem; border-radius: 0 !important; }
        .booking-card { display: none !important; }
        @media(min-width: 1024px) {
          .lg-grid { grid-template-columns: 1fr 320px !important; }
          .hero-container { margin-left: 0; margin-right: 0; margin-top: 0; border-radius: 16px !important; }
          .booking-card { display: block !important; }
          .mobile-book-btn { display: none !important; }
        }
      `}</style>
    </PageLayout>
  );
}
