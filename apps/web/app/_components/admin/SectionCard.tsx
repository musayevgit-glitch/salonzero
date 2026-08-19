import type { ReactNode } from 'react';

export interface SectionCardProps {
  title?: ReactNode;
  /** Right-hand side of the card header, e.g. a "view all" link. */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Set false when the body supplies its own padding (e.g. a flush list). */
  padded?: boolean;
  className?: string;
}

/** White card with an optional titled header — the main content container in admin pages. */
export function SectionCard({
  title,
  headerAction,
  children,
  padded = true,
  className,
}: SectionCardProps) {
  return (
    <section className={className ? `admin-card ${className}` : 'admin-card'}>
      {title || headerAction ? (
        <div className="admin-card-header">
          {title ? <h2 className="admin-card-title">{title}</h2> : <span />}
          {headerAction}
        </div>
      ) : null}
      <div className={padded ? 'admin-card-body' : undefined}>{children}</div>
    </section>
  );
}
