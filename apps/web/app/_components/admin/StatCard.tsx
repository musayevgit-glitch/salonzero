import NextLink from 'next/link';
import type { ReactNode } from 'react';

export type StatTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneStyles: Record<StatTone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--color-accent-muted)', fg: 'var(--color-accent)' },
  success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
  danger: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  info: { bg: 'var(--color-info-soft)', fg: 'var(--color-info)' },
  neutral: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-secondary)' },
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  /** When set the whole card becomes a link. */
  href?: string;
}

/** KPI tile used in the top row of the admin dashboards. */
export function StatCard({ label, value, sub, icon, tone = 'accent', href }: StatCardProps) {
  const palette = toneStyles[tone];

  const body = (
    <>
      {icon ? (
        <span
          className="stat-card-icon"
          style={{ background: palette.bg, color: palette.fg }}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="stat-card-body">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
        {sub ? <span className="stat-card-sub">{sub}</span> : null}
      </span>
    </>
  );

  if (href) {
    return (
      <NextLink href={href} className="stat-card">
        {body}
      </NextLink>
    );
  }

  return <div className="stat-card">{body}</div>;
}
