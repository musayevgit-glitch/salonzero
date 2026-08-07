import type { ReactNode } from 'react';
import { SuperadminShell } from './_components/SuperadminShell';

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return <SuperadminShell>{children}</SuperadminShell>;
}
