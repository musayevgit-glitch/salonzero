import { getIsAuthenticated } from '../../lib/fetch-api-server';
import { fetchPublicApi } from '../../lib/public-api';
import { LandingPage } from '../_components/LandingPage';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');
  return {
    title: 'Salonomia — Beauty booking',
    description: t('heroSubtitle'),
  };
}

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

export default async function HomePage() {
  const [isAuthenticated, salonsResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<{ items: SalonListItem[]; total: number }>(
      '/public/salons?pageSize=6&sort=name_asc',
    ).catch(() => null),
  ]);

  const salons = salonsResult?.items ?? [];
  // `total` is the count of ACTIVE salons the public API actually returns — no mock figures.
  const salonCount = salonsResult?.total ?? 0;

  return <LandingPage isAuthenticated={isAuthenticated} salons={salons} salonCount={salonCount} />;
}
