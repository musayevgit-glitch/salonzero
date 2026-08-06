import { Link, PublicShell } from '@salonomia/ui';
import type { ReactNode } from 'react';

// Account section nav — currently just Profile; Reservations lands in Section 18.6 and slots in
// here without restructuring the shell.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell isAuthenticated>
      <div className="flex flex-col gap-6">
        <nav
          aria-label="Account"
          className="flex gap-1 overflow-x-auto border-b border-border"
        >
          <Link
            href="/account"
            className="border-b-2 border-accent px-3 py-2 text-sm font-medium text-text-primary no-underline"
          >
            Profile
          </Link>
        </nav>
        {children}
      </div>
    </PublicShell>
  );
}
