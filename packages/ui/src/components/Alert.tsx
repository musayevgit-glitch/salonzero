import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<AlertTone, string> = {
  info: 'border-border bg-surface text-text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

const toneIcon: Record<AlertTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '!',
  danger: '✕',
};

export interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
}

export function Alert({ tone = 'info', title, children }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-[var(--radius-md)] border p-4 text-sm', toneClasses[tone])}
    >
      <span aria-hidden="true">{toneIcon[tone]}</span>
      <div>
        <p className="font-medium">{title}</p>
        {children ? <div className="mt-1 text-text-secondary">{children}</div> : null}
      </div>
    </div>
  );
}
