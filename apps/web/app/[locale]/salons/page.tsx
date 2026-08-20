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
}

interface SalonListResponse {
  items: SalonListItem[];
  total: number;
  page: number;
  pageSize: number;
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

  const [isAuthenticated, fetchResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<SalonListResponse>('/public/salons', { params }).catch((err: unknown) => err),
  ]);

  const isError = fetchResult instanceof Error;
  const data = isError ? null : (fetchResult as SalonListResponse);
  const salons: SalonListItem[] = data ? data.items : [];
  const total = data ? data.total : 0;
  const currentPage = data ? data.page : 1;
  const totalPages = data ? Math.ceil(total / data.pageSize) : 1;

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="salons">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 700, color: '#1e1b2e', margin: '0 0 1rem 0' }}>
          {t('title')}
        </h1>
      </div>

      <SalonFilters
        initial={{
          search,
          city,
          genderFocus,
          sort,
        }}
      />

      {isError ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#7c6fa0' }}>
          {t('loadError')}
        </div>
      ) : salons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#7c6fa0' }}>
          {t('empty')}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gap: '1.5rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>

          {(currentPage > 1 || currentPage < totalPages) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
              {currentPage > 1 && (
                <Link
                  href={`/salons?page=${currentPage - 1}${search ? `&search=${search}` : ''}${city ? `&city=${city}` : ''}${genderFocus ? `&genderFocus=${genderFocus}` : ''}${sort !== 'name_asc' ? `&sort=${sort}` : ''}`}
                  style={{ padding: '0.6rem 1.5rem', border: '1px solid #e4d4f4', borderRadius: 8, color: '#1e1b2e', textDecoration: 'none', fontWeight: 600, background: 'white' }}
                >
                  {t('prevPage')}
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/salons?page=${currentPage + 1}${search ? `&search=${search}` : ''}${city ? `&city=${city}` : ''}${genderFocus ? `&genderFocus=${genderFocus}` : ''}${sort !== 'name_asc' ? `&sort=${sort}` : ''}`}
                  style={{ padding: '0.6rem 1.5rem', border: '1px solid #e4d4f4', borderRadius: 8, color: '#1e1b2e', textDecoration: 'none', fontWeight: 600, background: 'white' }}
                >
                  {t('nextPage')}
                </Link>
              )}
            </div>
          )}
        </>
      )}
      <style>{`
        @media (min-width: 1024px) { div[style*="gridTemplateColumns"] { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 768px) and (max-width: 1023px) { div[style*="gridTemplateColumns"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 767px) { div[style*="gridTemplateColumns"] { grid-template-columns: 1fr !important; } }
      `}</style>
    </PageLayout>
  );
}
