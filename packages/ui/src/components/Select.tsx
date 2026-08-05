'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

// Native <select> is used deliberately: it already has correct keyboard/screen-reader behavior
// on every platform, per ADR-0007's "don't wrap what's already accessible" rationale.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-h-11 w-full rounded-[var(--radius-sm)] border bg-surface-raised px-3 text-sm text-text-primary',
          invalid ? 'border-danger' : 'border-border',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';
