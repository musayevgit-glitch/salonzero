import type { Metadata } from 'next';
import Link from 'next/link';
import { PageLayout } from '../_components/PageLayout';
import { getIsAuthenticated } from '../../lib/fetch-api-server';
import { fetchPublicApi } from '../../lib/public-api';
import { SalonCard } from '../_components/SalonCard';

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
  if (genderFocus) params.genderFocus = genderFocus;
  if (minPrice) params.minPrice = minPrice;
  if (maxPrice) params.maxPrice = maxPrice;

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
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 700, color: '#1a1208', margin: '0 0 1rem 0' }}>
          Salonlar
        </h1>
        <p style={{ color: '#9a8878', fontSize: '1rem', margin: 0 }}>
          Sizin üçün ən uyğun salonu tapın və rahat rezervasiya edin.
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #ede5dc',
          padding: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <form style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Axtarış</label>
            <input type="text" name="search" defaultValue={search} placeholder="Salon adı..." style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Şəhər</label>
            <input type="text" name="city" defaultValue={city} placeholder="Bakı..." style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Kimlər üçün</label>
            <select name="genderFocus" defaultValue={genderFocus} style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}>
              <option value="">Hər kəs</option>
              <option value="Women">Qadın</option>
              <option value="Men">Kişi</option>
              <option value="Unisex">Uniseks</option>
            </select>
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Sıralama</label>
            <select name="sort" defaultValue={sort} style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}>
              <option value="name_asc">Ad A-Z</option>
              <option value="name_desc">Ad Z-A</option>
              <option value="newest">Ən yeni</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 200px' }}>
            <button type="submit" style={{ flex: 1, height: 44, boxSizing: 'border-box', background: '#5c3d28', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
              Filtrləri tətbiq et
            </button>
            <Link href="/salons" style={{ color: '#9a8878', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: 500 }}>
              Sıfırla
            </Link>
          </div>
        </form>
      </div>

      {isError ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9a8878' }}>
          Salonlar yüklənə bilmədi
        </div>
      ) : salons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9a8878' }}>
          Heç bir salon tapılmadı
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
            {salons.map((salon, index) => (
              <SalonCard key={salon.id} salon={salon} index={index} />
            ))}
          </div>

          {(currentPage > 1 || currentPage < totalPages) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
              {currentPage > 1 && (
                <Link
                  href={`/salons?page=${currentPage - 1}${search ? `&search=${search}` : ''}${city ? `&city=${city}` : ''}${genderFocus ? `&genderFocus=${genderFocus}` : ''}${sort !== 'name_asc' ? `&sort=${sort}` : ''}`}
                  style={{ padding: '0.6rem 1.5rem', border: '1px solid #ede5dc', borderRadius: 8, color: '#1a1208', textDecoration: 'none', fontWeight: 600, background: 'white' }}
                >
                  Əvvəlki
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/salons?page=${currentPage + 1}${search ? `&search=${search}` : ''}${city ? `&city=${city}` : ''}${genderFocus ? `&genderFocus=${genderFocus}` : ''}${sort !== 'name_asc' ? `&sort=${sort}` : ''}`}
                  style={{ padding: '0.6rem 1.5rem', border: '1px solid #ede5dc', borderRadius: 8, color: '#1a1208', textDecoration: 'none', fontWeight: 600, background: 'white' }}
                >
                  Növbəti
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
