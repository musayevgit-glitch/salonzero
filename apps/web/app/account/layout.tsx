import { PublicShell } from '@salonomia/ui';
import type { ReactNode } from 'react';
import { AccountNav } from './_components/AccountNav';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell isAuthenticated>
      <div className="flex flex-col gap-6">
        <AccountNav />
        {children}
      </div>
    </PublicShell>
  );
}
