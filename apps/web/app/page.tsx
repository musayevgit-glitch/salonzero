import type { Metadata } from 'next';
import Image from 'next/image';
import { getIsAuthenticated } from '../lib/fetch-api-server';
import { fetchPublicApi, PublicApiError } from '../lib/public-api';
import { LandingPage } from './_components/LandingPage';

export const metadata: Metadata = {
  title: 'Salonomia — Gözəlliyinizə zaman ayırın',
  description: 'Sevdiyiniz salonu və ustanı seçin, rezervasiyanızı bir neçə klikdə edin.',
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

export default async function HomePage() {
  const [isAuthenticated, fetchResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<SalonListResponse>('/public/salons?page=1&sort=name_asc&pageSize=6').catch(
      (err) => err,
    ),
  ]);

  let salons: SalonListItem[] = [];
  if (!(fetchResult instanceof Error)) {
    salons = fetchResult.items.slice(0, 6);
  }

  return <LandingPage isAuthenticated={isAuthenticated} salons={salons} />;
}
