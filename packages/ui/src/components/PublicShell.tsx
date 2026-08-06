import type { ReactNode } from 'react';
import { Link } from './Link';

export interface PublicShellProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function PublicShell({ children, isAuthenticated }: PublicShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-[var(--z-navigation)] border-b border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[var(--width-content)] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold text-text-primary no-underline">
            Salonomia
          </Link>
          <nav aria-label="Main">
            {isAuthenticated ? (
              <Link href="/account">Account</Link>
            ) : (
              <Link href="/login">Log in</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[var(--width-content)] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-text-secondary">
        © {new Date().getFullYear()} Salonomia
      </footer>
    </div>
  );
}
