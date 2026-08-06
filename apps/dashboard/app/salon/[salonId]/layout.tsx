import type { ReactNode } from 'react';
import { SalonShell } from './_components/SalonShell';

export default async function SalonLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ salonId: string }>;
}) {
  const { salonId } = await params;
  return <SalonShell salonId={salonId}>{children}</SalonShell>;
}
