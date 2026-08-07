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
  startingPrice: { amount: number; currency: string } | null;
}

export default async function HomePage() {
  const [isAuthenticated, salonsResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<{ items: SalonListItem[] }>('/public/salons?pageSize=6&sort=name_asc').catch(() => null),
  ]);

  const salons = salonsResult?.items ?? [];

  return <LandingPage isAuthenticated={isAuthenticated} salons={salons} />;
}
