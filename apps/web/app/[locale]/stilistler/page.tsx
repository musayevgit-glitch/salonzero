import type { Metadata } from 'next';
import { PageLayout } from '../../_components/PageLayout';
import { getIsAuthenticated } from '../../../lib/fetch-api-server';
import { fetchPublicApi } from '../../../lib/public-api';
import { StilistlerClient, type Stylist } from './StilistlerClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Stilistlər — Salonomia',
  description: 'Salonomia platformasındakı peşəkar stilistlər və onların əl işləri ilə tanış olun.',
};

interface PublicSalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
}

interface PublicSalonDetail {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  employees: {
    id: string;
    fullName: string;
    bio: string | null;
    portfolio: { id: string; imageUrl: string; caption: string | null }[];
  }[];
}

export default async function StilistlerPage() {
  const isAuthenticated = await getIsAuthenticated();

  let stylists: Stylist[] = [];

  try {
    // 1. Fetch all salons
    const salonsRes = await fetchPublicApi<{ items: PublicSalonListItem[] }>('/public/salons?pageSize=50', { noStore: true });

    // 2. Fetch details for each salon to get their employees
    const details = await Promise.all(
      (salonsRes?.items || []).map(async (s) => {
        try {
          return await fetchPublicApi<PublicSalonDetail>(`/public/salons/${s.slug}`, { noStore: true });
        } catch {
          return null;
        }
      })
    );

    // 3. Extract and combine stylists
    const list: Stylist[] = [];
    for (const salon of details) {
      if (!salon || !salon.employees) continue;
      for (const emp of salon.employees) {
        list.push({
          id: emp.id,
          fullName: emp.fullName,
          bio: emp.bio,
          portfolio: emp.portfolio || [],
          salon: {
            id: salon.id,
            slug: salon.slug,
            name: salon.name,
            city: salon.city,
          },
        });
      }
    }
    stylists = list;
  } catch (err) {
    console.error('Failed to load stylists:', err);
  }

  return (
    <PageLayout isAuthenticated={isAuthenticated} activeNav="stilistler">
      <StilistlerClient stylists={stylists} />
    </PageLayout>
  );
}
