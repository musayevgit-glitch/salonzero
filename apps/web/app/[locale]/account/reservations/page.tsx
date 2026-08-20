import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { fetchApiServer, ApiServerError } from '../../../../lib/fetch-api-server';
import { PageLayout } from '../../../_components/PageLayout';
import { RatingPrompt } from '../../../_components/RatingPrompt';
import { getInitials } from '../../../../lib/initials';
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
  CANCELLED_BY_CUSTOMER: { background: '#fee2e2', color: '#b91c1c' },
  CANCELLED_BY_SALON: { background: '#fee2e2', color: '#b91c1c' },
  REJECTED: { background: '#fee2e2', color: '#b91c1c' },
  CHECKED_IN: { background: '#dbeafe', color: '#1e40af' },
  COMPLETED: { background: '#f3f4f6', color: '#4b5563' },
  NO_SHOW: { background: '#f3f4f6', color: '#4b5563' },
};

/** Statuses whose appointment can still be called off by the customer. */
const CANCELLABLE = new Set(['PENDING', 'CONFIRMED']);

type Tab = 'upcoming' | 'past';

export default async function ReservationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; tab?: string }>;
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

  const { page: pageParam, status, tab: tabParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const tab: Tab = tabParam === 'past' ? 'past' : 'upcoming';

  let data: ReservationList;
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    data = await fetchApiServer<ReservationList>(`/customer/reservations?${params}`, {
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof ApiServerError && (err.status === 401 || err.status === 403)) {
      redirect('/login?returnTo=/account/reservations');
    }
    notFound();
  }

  const totalPages = Math.ceil(data.total / data.pageSize);

  const statusOptions = [
    { value: ALL_STATUSES, label: t('statusAll') },
    ...Object.entries(STATUS_MAP).map(([value, label]) => ({ value, label })),
  ];

  // The API paginates over every reservation; the tab split is applied to the page that came
  // back, so "Upcoming" always means "not yet started" for the rows currently on screen.
  const now = Date.now();
  const visible = data.items.filter((r) =>
    tab === 'upcoming' ? new Date(r.startAt).getTime() >= now : new Date(r.startAt).getTime() < now,
  );

  function tabHref(target: Tab): string {
    const qs = new URLSearchParams();
    if (target === 'past') qs.set('tab', 'past');
    if (status) qs.set('status', status);
    const q = qs.toString();
    return q ? `/account/reservations?${q}` : '/account/reservations';
  }

  function pageHref(target: number): string {
    const qs = new URLSearchParams();
    if (tab === 'past') qs.set('tab', 'past');
    if (status) qs.set('status', status);
    if (target > 1) qs.set('page', String(target));
    const q = qs.toString();
    return q ? `/account/reservations?${q}` : '/account/reservations';
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'upcoming', label: t('tabUpcoming') },
    { id: 'past', label: t('tabPast') },
  ];

  return (
    <PageLayout activeNav="reservations" isAuthenticated={true}>
      <div className="sz-res">
        <h1 className="sz-res-title">{t('reservationsTitle')}</h1>

        <nav className="sz-res-tabs" aria-label={t('reservationsTitle')}>
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={tabHref(item.id)}
              className={item.id === tab ? 'sz-res-tab sz-res-tab-active' : 'sz-res-tab'}
              aria-current={item.id === tab ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Status filter — a dropdown so it scales as statuses are added */}
        <ReservationStatusFilter
          value={status && STATUS_MAP[status] ? status : ALL_STATUSES}
          label={t('statusFilterLabel')}
          options={statusOptions}
          tab={tab}
        />

        {visible.length === 0 ? (
          <div className="sz-res-empty">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <rect
                x="12"
                y="18"
                width="56"
                height="50"
                rx="10"
                stroke="#e4d4f4"
                strokeWidth="2.5"
              />
              <path
                d="M26 12v12M54 12v12M12 34h56"
                stroke="#6A5ACD"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="sz-res-empty-title">
              {tab === 'upcoming' ? t('noUpcoming') : t('noPast')}
            </p>
            <Link href="/salons" className="sz-res-empty-cta">
              {t('discoverSalons')}
            </Link>
          </div>
        ) : (
          <ul className="sz-res-list">
            {visible.map((r) => {
              const badge = BADGE_STYLE[r.status] ?? { background: '#f3f4f6', color: '#4b5563' };
              const dateStr = formatLongDateTime(r.startAt, locale);
              const cancellable = tab === 'upcoming' && CANCELLABLE.has(r.status);

              return (
                <li key={r.id} className="sz-res-card">
                  <div className="sz-res-head">
                    <span className="sz-res-logo" aria-hidden="true">
                      {getInitials(r.salon.name)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="sz-res-salon">{r.salon.name}</p>
                      <p className="sz-res-service">{r.service.name}</p>
                    </div>
                    <span className="sz-res-badge" style={badge}>
                      {STATUS_MAP[r.status] ?? r.status}
                    </span>
                  </div>

                  <dl className="sz-res-facts">
                    <div>
                      <dt>
                        {tb('date')} &amp; {tb('time')}
                      </dt>
                      <dd>{dateStr}</dd>
                    </div>
                    <div>
                      <dt>{tb('stylist')}</dt>
                      <dd>{r.employee?.fullName || tb('anyStylist')}</dd>
                    </div>
                  </dl>

                  <div className="sz-res-foot">
                    <span className="sz-res-price">{formatMoney(r.priceAmount)}</span>
                    <span className="sz-res-actions">
                      {/* Cancellation is confirmed on the detail page — never one click from a list. */}
                      {cancellable ? (
                        <Link href={`/account/reservations/${r.id}`} className="sz-res-cancel">
                          {t('cancelReservation')}
                        </Link>
                      ) : null}
                      <Link href={`/account/reservations/${r.id}`} className="sz-res-details">
                        {t('viewDetails')}
                      </Link>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="sz-res-pager" aria-label={t('reservationsTitle')}>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="sz-res-pagelink" rel="prev">
                {t('prevPage')}
              </Link>
            ) : (
              <span />
            )}
            <span className="sz-res-pagecount">
              {t('pageOf', { current: page, total: totalPages })}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="sz-res-pagelink" rel="next">
                {t('nextPage')}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      {/* Asks the server for this customer's own unrated completed visits; renders nothing
          when there are none or when the prompt was dismissed earlier this session. */}
      <RatingPrompt />

      <style>{`
        .sz-res { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
        .sz-res-title {
          margin: 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.7rem, 4.5vw, 2.2rem);
          font-weight: 700; color: #1e1b2e; line-height: 1.15;
        }
        .sz-res-tabs {
          display: flex; gap: 0.3rem; padding: 0.3rem;
          background: #fff; border: 1px solid #e4d4f4; border-radius: 14px;
        }
        .sz-res-tab {
          flex: 1; text-align: center; padding: 0.6rem 0.9rem; border-radius: 11px;
          font-size: 0.88rem; font-weight: 600; color: #7c6fa0; text-decoration: none;
        }
        .sz-res-tab:hover { background: #faf5ff; color: #4a3f6b; }
        .sz-res-tab-active { background: #6A5ACD; color: #fff; }
        .sz-res-tab-active:hover { background: #5c4cbe; color: #fff; }
        .sz-res-tab:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-res-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
        .sz-res-card {
          background: #fff; border: 1px solid #e4d4f4; border-radius: 18px;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 0.9rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
        }
        .sz-res-head { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
        .sz-res-logo {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(106,90,205,0.10); color: #6A5ACD; font-weight: 700; font-size: 0.85rem;
        }
        .sz-res-salon {
          margin: 0; font-size: 1rem; font-weight: 700; color: #1e1b2e;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sz-res-service { margin: 0.15rem 0 0; font-size: 0.86rem; color: #7c6fa0; }
        .sz-res-badge {
          flex-shrink: 0; padding: 0.28rem 0.7rem; border-radius: 999px;
          font-size: 0.72rem; font-weight: 700; white-space: nowrap;
        }
        .sz-res-facts { margin: 0; display: grid; grid-template-columns: 1fr; gap: 0.6rem; }
        .sz-res-facts dt { font-size: 0.72rem; color: #9d92bd; text-transform: uppercase; letter-spacing: 0.05em; }
        .sz-res-facts dd { margin: 0.15rem 0 0; font-size: 0.88rem; font-weight: 600; color: #1e1b2e; }
        .sz-res-foot {
          display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
          flex-wrap: wrap; padding-top: 0.9rem; border-top: 1px solid #f0e8f5;
        }
        .sz-res-price { font-size: 1.05rem; font-weight: 700; color: #1e1b2e; }
        .sz-res-actions { display: flex; align-items: center; gap: 0.5rem; }
        .sz-res-cancel {
          padding: 0.45rem 0.9rem; border-radius: 10px; border: 1px solid #fecaca;
          color: #b91c1c; font-size: 0.82rem; font-weight: 600; text-decoration: none;
        }
        .sz-res-cancel:hover { background: #fef2f2; }
        .sz-res-details {
          padding: 0.45rem 0.9rem; border-radius: 10px; background: rgba(106,90,205,0.10);
          color: #5b21b6; font-size: 0.82rem; font-weight: 600; text-decoration: none;
        }
        .sz-res-details:hover { background: rgba(106,90,205,0.18); }
        .sz-res-cancel:focus-visible, .sz-res-details:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-res-empty {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 3.5rem 1rem; background: #fff;
          border: 1px dashed #e4d4f4; border-radius: 18px;
        }
        .sz-res-empty-title { margin: 1rem 0 1.25rem; font-size: 0.95rem; font-weight: 600; color: #1e1b2e; }
        .sz-res-empty-cta {
          padding: 0.7rem 1.5rem; border-radius: 12px; background: #6A5ACD; color: #fff;
          font-size: 0.88rem; font-weight: 700; text-decoration: none;
        }
        .sz-res-empty-cta:hover { background: #5c4cbe; }
        .sz-res-empty-cta:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-res-pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .sz-res-pagelink {
          padding: 0.55rem 1rem; border: 1px solid #e4d4f4; border-radius: 10px;
          background: #fff; color: #4a3f6b; font-size: 0.85rem; font-weight: 600; text-decoration: none;
        }
        .sz-res-pagelink:hover { background: #f3e8ff; border-color: #c4b5fd; }
        .sz-res-pagelink:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-res-pagecount { font-size: 0.85rem; color: #7c6fa0; }

        @media (min-width: 480px) { .sz-res-facts { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </PageLayout>
  );
}
