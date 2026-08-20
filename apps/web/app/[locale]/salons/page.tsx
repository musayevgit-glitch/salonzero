import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageLayout } from '../../_components/PageLayout';
import { getIsAuthenticated } from '../../../lib/fetch-api-server';
import { fetchPublicApi } from '../../../lib/public-api';
import { SalonCard } from '../../_components/SalonCard';
import { SalonFilters } from './SalonFilters';

export const metadata: Metadata = {
  title: 'Salonlar — Salonomia',
};

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  startingPrice: { amount: number; currency: string } | null;
  /** Real mean of customer ratings; null until this salon has been rated at least once. */
  avgRating: number | null;
  ratingCount: number;
}

interface SalonListResponse {
  items: SalonListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function EmptyIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <circle cx="44" cy="44" r="43" stroke="#e4d4f4" strokeWidth="2" />
      <circle cx="39" cy="39" r="15" stroke="#6A5ACD" strokeWidth="2.5" />
      <path d="M50 50l14 14" stroke="#6A5ACD" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === 'string' ? sp.search : '';
  const city = typeof sp.city === 'string' ? sp.city : '';
  const genderFocus = typeof sp.genderFocus === 'string' ? sp.genderFocus : '';
  const minPrice = typeof sp.minPrice === 'string' ? sp.minPrice : '';
  const maxPrice = typeof sp.maxPrice === 'string' ? sp.maxPrice : '';
  const sort = typeof sp.sort === 'string' ? sp.sort : 'name_asc';
  const page = typeof sp.page === 'string' ? sp.page : '1';

  const params: Record<string, string> = {
    page,
    sort,
    pageSize: '12',
  };
  if (search) params.search = search;
  if (city) params.city = city;
  if (genderFocus) params.genderFocus = genderFocus.toUpperCase();
  if (minPrice) params.minPrice = minPrice;
  if (maxPrice) params.maxPrice = maxPrice;

  const t = await getTranslations('salons');

  /**
   * Builds a listing URL for `targetPage`, preserving every active filter.
   *
   * Previously these links were string-concatenated and dropped minPrice/maxPrice entirely, so
   * paging silently widened a price-filtered result set. Concatenation also left the values
   * unencoded — a search for "cut & colour" truncated the query at the ampersand.
   */
  function pageHref(targetPage: number): string {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (city) qs.set('city', city);
    if (genderFocus) qs.set('genderFocus', genderFocus);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (sort !== 'name_asc') qs.set('sort', sort);
    if (targetPage > 1) qs.set('page', String(targetPage));
    const query = qs.toString();
    return query ? `/salons?${query}` : '/salons';
  }

  const [isAuthenticated, fetchResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<SalonListResponse>('/public/salons', { params }).catch((err: unknown) => err),
  ]);

  const isError = fetchResult instanceof Error;
  const data = isError ? null : (fetchResult as SalonListResponse);
  const salons: SalonListItem[] = data ? data.items : [];
  const total = data ? data.total : 0;
  const currentPage = data ? data.page : 1;
  const totalPages = data ? Math.max(1, Math.ceil(total / data.pageSize)) : 1;

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="salons">
      <header style={{ marginBottom: '1.75rem', maxWidth: 680 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.9rem, 5vw, 2.6rem)',
            fontWeight: 700,
            color: '#1e1b2e',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {t('title')}
        </h1>
        <p style={{ margin: '0.6rem 0 0', color: '#7c6fa0', fontSize: '1rem', lineHeight: 1.6 }}>
          {t('pageSubtitle')}
        </p>
      </header>

      <SalonFilters
        initial={{
          search,
          city,
          genderFocus,
          sort,
        }}
      />

      {isError ? (
        <div className="sz-list-state">
          <EmptyIllustration />
          <p style={{ color: '#1e1b2e', fontWeight: 600, margin: '1rem 0 0' }}>{t('loadError')}</p>
        </div>
      ) : salons.length === 0 ? (
        <div className="sz-list-state">
          <EmptyIllustration />
          <p style={{ color: '#1e1b2e', fontWeight: 600, margin: '1rem 0 0.35rem' }}>
            {t('empty')}
          </p>
          <p style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: 0 }}>{t('emptyHint')}</p>
        </div>
      ) : (
        <>
          <p
            aria-live="polite"
            style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: '#7c6fa0' }}
          >
            {t('resultCount', { count: total })}
          </p>

          <div className="sz-salons-grid">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label={t('title')} className="sz-pagination">
              {currentPage > 1 ? (
                <Link href={pageHref(currentPage - 1)} className="sz-page-link" rel="prev">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M8.5 3.5 5 7l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('prevPage')}
                </Link>
              ) : (
                <span className="sz-page-link sz-page-link-off" aria-disabled="true">
                  {t('prevPage')}
                </span>
              )}

              <span className="sz-page-count">
                {t('pageLabel', { current: currentPage, total: totalPages })}
              </span>

              {currentPage < totalPages ? (
                <Link href={pageHref(currentPage + 1)} className="sz-page-link" rel="next">
                  {t('nextPage')}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M5.5 3.5 9 7l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ) : (
                <span className="sz-page-link sz-page-link-off" aria-disabled="true">
                  {t('nextPage')}
                </span>
              )}
            </nav>
          )}
        </>
      )}

      <style>{`
        .sz-salons-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 640px) { .sz-salons-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .sz-salons-grid { grid-template-columns: repeat(3, 1fr); } }

        .sz-list-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4rem 1rem;
          background: #fff;
          border: 1px dashed #e4d4f4;
          border-radius: 18px;
        }

        .sz-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }
        .sz-page-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.6rem 1.15rem;
          border: 1px solid #e4d4f4;
          border-radius: 10px;
          color: #4a3f6b;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.86rem;
          background: white;
        }
        .sz-page-link:hover { background: #f3e8ff; border-color: #c4b5fd; color: #5b21b6; }
        .sz-page-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-page-link-off { opacity: 0.42; pointer-events: none; }
        .sz-page-count { font-size: 0.85rem; color: #7c6fa0; font-weight: 600; }
      `}</style>
    </PageLayout>
  );
}
