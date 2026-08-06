import type { ReactNode } from 'react';
import { Link } from './Link';

export interface PublicShellProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

/* Inline SVG scissor-inspired wordmark — no external asset needed */
function SalonomiaWordmark() {
  return (
    <span className="inline-flex items-center gap-2 no-underline">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden="true"
        className="text-accent"
      >
        <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="11" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <span
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        className="text-lg font-semibold tracking-tight text-text-primary"
      >
        Salonomia
      </span>
    </span>
  );
}

export function PublicShell({ children, isAuthenticated }: PublicShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* Header: sticky, glass blur, subtle gradient bottom line */}
      <header className="sticky top-0 z-[var(--z-navigation)] bg-surface/90 backdrop-blur-md">
        <div
          className="mx-auto flex h-16 max-w-[var(--width-content)] items-center justify-between px-4 sm:px-6 lg:px-8"
          style={{
            borderBottom: '1px solid',
            borderImage:
              'linear-gradient(90deg, transparent, var(--color-border) 30%, var(--color-border-strong) 50%, var(--color-border) 70%, transparent) 1',
          }}
        >
          <Link href="/" className="no-underline">
            <SalonomiaWordmark />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-6">
            <Link
              href="/salons"
              className="hidden text-sm text-text-secondary transition-colors hover:text-text-primary sm:block"
            >
              Discover
            </Link>
            {isAuthenticated ? (
              <Link
                href="/account"
                className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-primary shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] no-underline"
              >
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-primary shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] no-underline"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[var(--width-content)] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-border bg-surface-raised">
        <div className="mx-auto max-w-[var(--width-content)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <SalonomiaWordmark />
            <p className="text-sm text-text-secondary">
              © {new Date().getFullYear()} Salonomia. Book calmer. Look sharper.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
