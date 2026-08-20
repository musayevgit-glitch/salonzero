import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getIsAuthenticated } from '../../../../lib/fetch-api-server';
import { fetchPublicApi, PublicApiError } from '../../../../lib/public-api';
import { PageLayout } from '../../../_components/PageLayout';
import { resolveSalonCoverUrl, resolveSalonLogoUrl } from '../../../../lib/salon-images';
import { getInitials } from '../../../../lib/initials';
import { formatMoney } from '../../../../lib/format-money';
import { StylistCard } from './StylistCard';
import { SalonTabs, type SalonTab } from './SalonTabs';

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
  logoUrl: string | null;
  coverUrl: string | null;
  /** Real mean of customer ratings; null until this salon has been rated at least once. */
  avgRating: number | null;
  ratingCount: number;
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

function formatMinuteOfDay(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

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

  const t = await getTranslations('salonDetail');
  const tr = await getTranslations('ratings');
  const locale = await getLocale();

  const [isAuthenticated, salonResult] = await Promise.all([
    getIsAuthenticated(),
    loadSalon(slug).catch((err) => err as Error),
  ]);

  if (salonResult instanceof Error) {
    return (
      <PageLayout isAuthenticated={isAuthenticated}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: '#7c6fa0' }}>{t('loadError')}</p>
        </div>
      </PageLayout>
    );
  }

  const salon = salonResult;
  if (!salon) notFound();

  const bookHref = `/salons/${salon.slug}/book/service`;
  const logoUrl = resolveSalonLogoUrl(salon.logoUrl);
  const hasRating = typeof salon.avgRating === 'number' && salon.ratingCount > 0;
  const hasServices = salon.serviceCategories.length > 0 || salon.uncategorizedServices.length > 0;

  const genderKey = (salon.genderFocus ?? '').toUpperCase();
  const genderLabel =
    genderKey === 'WOMEN'
      ? t('genderWomen')
      : genderKey === 'MEN'
        ? t('genderMen')
        : genderKey === 'UNISEX'
          ? t('genderUnisex')
          : null;

  function ServiceRow({ service }: { service: PublicService }) {
    return (
      <li className="sz-svc-row">
        <div style={{ minWidth: 0 }}>
          <p className="sz-svc-name">{service.name}</p>
          {service.description ? <p className="sz-svc-desc">{service.description}</p> : null}
          <p className="sz-svc-meta">
            {service.durationMinutes} {t('min')} ·{' '}
            <strong>{formatMoney(service.priceAmount)}</strong>
          </p>
        </div>
        <a href={bookHref} className="sz-svc-cta">
          {t('bookNow')}
        </a>
      </li>
    );
  }

  const servicesPanel = hasServices ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {salon.serviceCategories.map((category) => (
        <section key={category.id}>
          <h3 className="sz-svc-group">{category.name}</h3>
          <ul className="sz-svc-list">
            {category.services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </ul>
        </section>
      ))}
      {salon.uncategorizedServices.length > 0 ? (
        <section>
          {salon.serviceCategories.length > 0 ? (
            <h3 className="sz-svc-group">{t('otherServices')}</h3>
          ) : null}
          <ul className="sz-svc-list">
            {salon.uncategorizedServices.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  ) : (
    <p className="sz-empty-note">{t('noServices')}</p>
  );

  const stylistsPanel =
    salon.employees.length > 0 ? (
      <div className="sz-stylist-grid">
        {salon.employees.map((employee) => (
          <StylistCard
            key={employee.id}
            employee={employee}
            salonName={salon.name}
            salonSlug={salon.slug}
          />
        ))}
      </div>
    ) : (
      <p className="sz-empty-note">{t('noStylists')}</p>
    );

  const aboutPanel = (
    <div className="sz-about-grid">
      <div className="sz-panel">
        <h3 className="sz-panel-title">{t('about')}</h3>
        <p className="sz-panel-body">{salon.description || t('noDescription')}</p>
      </div>

      {salon.approximateOpeningHours.length > 0 ? (
        <div className="sz-panel">
          <h3 className="sz-panel-title">{t('hours')}</h3>
          <ul className="sz-kv-list">
            {salon.approximateOpeningHours.map((h) => {
              const date = new Date(2023, 0, 1 + h.weekday); // Jan 1 2023 was Sunday
              const weekdayLabel = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
                date,
              );
              return (
                <li key={h.weekday}>
                  <span>{weekdayLabel}</span>
                  <strong>
                    {formatMinuteOfDay(h.startMinuteOfDay)} – {formatMinuteOfDay(h.endMinuteOfDay)}
                  </strong>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {salon.addressLine || salon.phone || salon.email ? (
        <div className="sz-panel">
          <h3 className="sz-panel-title">{t('contact')}</h3>
          <ul className="sz-kv-list">
            {salon.addressLine ? (
              <li>
                <span>{salon.city ?? ''}</span>
                <strong>{salon.addressLine}</strong>
              </li>
            ) : null}
            {salon.phone ? (
              <li>
                <span>☎</span>
                <strong>
                  <a href={`tel:${salon.phone}`} className="sz-contact-link">
                    {salon.phone}
                  </a>
                </strong>
              </li>
            ) : null}
            {salon.email ? (
              <li>
                <span>✉</span>
                <strong>
                  <a href={`mailto:${salon.email}`} className="sz-contact-link">
                    {salon.email}
                  </a>
                </strong>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {salon.bookingPolicySummary ? (
        <div className="sz-panel">
          <h3 className="sz-panel-title">{t('bookingPolicy')}</h3>
          <ul className="sz-policy-list">
            <li>
              {salon.bookingPolicySummary.autoConfirm ? t('autoConfirmOn') : t('autoConfirmOff')}
            </li>
            <li>
              {t('cancelWindow', { hours: salon.bookingPolicySummary.cancellationWindowHours })}
            </li>
            <li>
              {t('rescheduleWindow', { hours: salon.bookingPolicySummary.rescheduleWindowHours })}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );

  const tabs: SalonTab[] = [
    { id: 'services', label: t('tabServices'), content: servicesPanel },
    { id: 'stylists', label: t('tabStylists'), content: stylistsPanel },
    { id: 'about', label: t('tabAbout'), content: aboutPanel },
  ];

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="salons" maxWidth={1280}>
      <div className="sz-detail">
        {/* Full-bleed cover — same resolution as the salon card (own cover, else placeholder). */}
        <div className="sz-cover">
          <img src={resolveSalonCoverUrl(salon.coverUrl)} alt="" aria-hidden="true" />
          <span className="sz-cover-veil" aria-hidden="true" />
        </div>

        <div className="sz-detail-body">
          <header className="sz-salon-head">
            {logoUrl ? (
              <img className="sz-head-logo" src={logoUrl} alt="" aria-hidden="true" />
            ) : (
              <span className="sz-head-logo sz-head-logo-fb" aria-hidden="true">
                {getInitials(salon.name)}
              </span>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="sz-head-name">{salon.name}</h1>
              <p className="sz-head-meta">
                {salon.city ? <span>{salon.city}</span> : null}
                {genderLabel ? <span className="sz-head-chip">{genderLabel}</span> : null}
                {/* The same real aggregate the cards show — never a placeholder score. */}
                {hasRating ? (
                  <span className="sz-head-rating">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 12 12"
                      fill="#f59e0b"
                      aria-hidden="true"
                    >
                      <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.1l-2.78 1.45.53-3.1L1.5 4.25l3.1-.45L6 1z" />
                    </svg>
                    {tr('ratingWithCount', {
                      rating: (salon.avgRating as number).toFixed(1),
                      count: salon.ratingCount,
                    })}
                  </span>
                ) : (
                  <span style={{ color: '#9d92bd' }}>{tr('noRating')}</span>
                )}
              </p>
            </div>

            <a href={bookHref} className="sz-head-cta">
              {t('bookNow')}
            </a>
          </header>

          <SalonTabs tabs={tabs} />
        </div>
      </div>

      {/* Mobile: the primary action stays reachable no matter how far the page has scrolled. */}
      <div className="sz-sticky-cta">
        <a href={bookHref}>{t('bookNow')}</a>
      </div>

      <style>{`
        .sz-detail {
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          max-width: 900px;
          /* Bottom gap keeps the last row clear of the fixed mobile booking bar. */
          margin: 0 auto 5rem;
        }
        .sz-cover { position: relative; height: 190px; background: #ede4f8; }
        .sz-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sz-cover-veil {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(30,27,46,0.35), rgba(30,27,46,0));
        }
        .sz-detail-body { padding: 1.25rem 1.25rem 2rem; }

        .sz-salon-head {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
          padding-bottom: 1.5rem;
          margin-top: -2.25rem;
        }
        .sz-head-logo {
          width: 64px; height: 64px; border-radius: 18px; object-fit: cover;
          border: 3px solid #fff; background: #fff; flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(30,27,46,0.18);
        }
        .sz-head-logo-fb {
          display: flex; align-items: center; justify-content: center;
          background: #6A5ACD; color: #fff; font-weight: 700; font-size: 1.1rem;
        }
        .sz-head-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700; color: #1e1b2e; margin: 0.6rem 0 0.35rem; line-height: 1.2;
        }
        .sz-head-meta {
          margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
          font-size: 0.85rem; color: #7c6fa0;
        }
        .sz-head-chip {
          background: rgba(106,90,205,0.10); color: #5b21b6;
          font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px;
        }
        .sz-head-rating { display: inline-flex; align-items: center; gap: 0.3rem; color: #4a3f6b; font-weight: 700; }
        .sz-head-cta {
          display: none;
          align-items: center; justify-content: center;
          padding: 0.8rem 1.7rem; border-radius: 12px;
          background: #6A5ACD; color: #fff; font-weight: 700; font-size: 0.92rem;
          text-decoration: none; margin-top: 0.9rem;
          box-shadow: 0 8px 22px rgba(106,90,205,0.28);
        }
        .sz-head-cta:hover { background: #5c4cbe; }
        .sz-head-cta:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-svc-group {
          font-size: 0.74rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: #6A5ACD; margin: 0 0 0.75rem;
        }
        .sz-svc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .sz-svc-row {
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
          padding: 0.95rem 0; border-bottom: 1px solid #f0e8f5;
        }
        .sz-svc-row:last-child { border-bottom: none; }
        .sz-svc-name { margin: 0; font-size: 0.95rem; font-weight: 600; color: #1e1b2e; }
        .sz-svc-desc {
          margin: 0.2rem 0 0; font-size: 0.82rem; color: #9d92bd; line-height: 1.45;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .sz-svc-meta { margin: 0.3rem 0 0; font-size: 0.82rem; color: #7c6fa0; }
        .sz-svc-meta strong { color: #1e1b2e; font-weight: 700; }
        .sz-svc-cta {
          flex-shrink: 0;
          padding: 0.5rem 1rem; border-radius: 10px;
          border: 1.5px solid #6A5ACD; color: #6A5ACD; background: #fff;
          font-size: 0.82rem; font-weight: 700; text-decoration: none; white-space: nowrap;
        }
        .sz-svc-cta:hover { background: #6A5ACD; color: #fff; }
        .sz-svc-cta:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-stylist-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .sz-empty-note {
          margin: 0; padding: 2.5rem 1rem; text-align: center;
          color: #7c6fa0; font-size: 0.92rem;
          border: 1px dashed #e4d4f4; border-radius: 14px;
        }

        .sz-about-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .sz-panel { background: #faf7ff; border: 1px solid #f0e8f5; border-radius: 16px; padding: 1.25rem; }
        .sz-panel-title { margin: 0 0 0.75rem; font-size: 0.95rem; font-weight: 700; color: #1e1b2e; }
        .sz-panel-body { margin: 0; font-size: 0.9rem; line-height: 1.65; color: #6b5d8a; }
        .sz-kv-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .sz-kv-list li {
          display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
          font-size: 0.87rem; color: #7c6fa0;
        }
        .sz-kv-list strong { color: #1e1b2e; font-weight: 600; text-align: right; }
        .sz-contact-link { color: #6A5ACD; text-decoration: none; }
        .sz-contact-link:hover { text-decoration: underline; }
        .sz-policy-list {
          margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.5rem;
          font-size: 0.87rem; color: #6b5d8a; line-height: 1.55;
        }

        .sz-sticky-cta {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 45;
          padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border-top: 1px solid #f0e8f5;
        }
        .sz-sticky-cta a {
          display: flex; align-items: center; justify-content: center;
          height: 50px; border-radius: 12px;
          background: #6A5ACD; color: #fff; font-weight: 700; font-size: 0.95rem; text-decoration: none;
        }
        .sz-sticky-cta a:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        @media (min-width: 640px) {
          .sz-detail-body { padding: 1.5rem 2rem 2.5rem; }
          .sz-cover { height: 260px; }
          .sz-about-grid { grid-template-columns: repeat(2, 1fr); }
          .sz-stylist-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 900px) {
          .sz-detail { margin-bottom: 0; }
          .sz-head-cta { display: inline-flex; margin-top: 2.4rem; }
          .sz-sticky-cta { display: none; }
          .sz-stylist-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </PageLayout>
  );
}
