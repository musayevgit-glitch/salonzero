import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-text-secondary border-border',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

// Status is never color-only: pair with a short label (never an icon-only/color-only badge).
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
