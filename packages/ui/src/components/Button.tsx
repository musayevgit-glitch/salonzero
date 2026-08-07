'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-accent-foreground',
    'shadow-[0_4px_20px_color-mix(in_srgb,var(--color-accent)_38%,transparent),inset_0_1px_0_rgba(255,255,255,0.22)]',
    'hover:opacity-90 active:opacity-80',
  ].join(' '),
  secondary: [
    'bg-white/80 text-text-primary border border-border',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_4px_rgba(30,27,46,0.08)]',
    'backdrop-blur-sm hover:bg-surface active:bg-surface',
  ].join(' '),
  ghost: 'bg-transparent text-text-primary hover:bg-surface active:bg-surface',
  destructive: [
    'bg-danger text-white',
    'shadow-[0_4px_16px_color-mix(in_srgb,var(--color-danger)_30%,transparent),inset_0_1px_0_rgba(255,255,255,0.18)]',
    'hover:opacity-90 active:opacity-80',
  ].join(' '),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-lg)]',
          'px-5 text-sm font-medium transition-[opacity,background-color,box-shadow] duration-[var(--duration-fast)]',
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
