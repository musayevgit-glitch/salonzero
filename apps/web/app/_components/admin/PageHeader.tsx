import NextLink from 'next/link';
import type { ReactNode } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Trailing controls (primary action, secondary actions). */
  actions?: ReactNode;
  /** Optional trail rendered above the title. The last entry is the current page. */
  breadcrumb?: Crumb[];
}

/**
 * Consistent page title block for the admin panels.
 * Presentation only — never gates behaviour; every route re-authorizes server-side.
 */
export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="page-breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.href ? (
                  <NextLink href={crumb.href}>{crumb.label}</NextLink>
                ) : (
                  <span aria-current="page" className="text-text-primary">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="page-header-title">{title}</h1>
        {description ? <p className="page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
