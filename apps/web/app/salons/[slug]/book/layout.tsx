import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { fetchPublicApi, PublicApiError } from '../../../../lib/public-api';
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
  let salon: SalonBookingData;
  try {
    salon = await fetchPublicApi<SalonBookingData>(`/public/salons/${slug}`);
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) notFound();
    throw err;
  }
  return <BookingShell salonData={salon}>{children}</BookingShell>;
}
