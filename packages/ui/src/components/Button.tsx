'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-lg btn-lg-primary',
  secondary: 'btn-lg btn-lg-secondary',
  ghost: 'btn-lg btn-lg-ghost',
  destructive: 'btn-lg btn-lg-destructive',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)]',
          'px-4 text-sm font-semibold transition-[opacity,background-color,box-shadow] duration-[var(--duration-fast)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {loading ? <span aria-hidden="true">…</span> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
