import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { fetchPublicApi, PublicApiError } from '../../../../../lib/public-api';
import { getIsAuthenticated } from '../../../../../lib/fetch-api-server';
import { PageFooter, PageHeader } from '../../../../_components/PageLayout';
import { BookingShell } from './_components/BookingContext';
import type { SalonBookingData } from './_components/BookingContext';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const salon = await fetchPublicApi<{ name: string }>(`/public/salons/${slug}`);
    return { title: `Book at ${salon.name} — Salonomia` };
  } catch {
    return { title: 'Book — Salonomia' };
  }
}

export default async function BookLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [isAuthenticated, salonResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<SalonBookingData>(`/public/salons/${slug}`).catch((err: unknown) => {
      if (err instanceof PublicApiError && err.status === 404) return null;
      throw err;
    }),
  ]);
  if (!salonResult) notFound();
  const salon: SalonBookingData = salonResult;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f9f6f3',
      }}
    >
      <PageHeader isAuthenticated={isAuthenticated} activeNav="salons" />
      <BookingShell salonData={salon}>{children}</BookingShell>
      <PageFooter />
    </div>
  );
}
