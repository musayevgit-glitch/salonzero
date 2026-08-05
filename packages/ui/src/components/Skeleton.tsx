import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-border', className)}
      {...props}
    />
  );
}
