'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends RadixCheckbox.CheckboxProps {
  label: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id ?? `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex items-center gap-2">
        <RadixCheckbox.Root
          ref={ref}
          id={inputId}
          className={cn(
            'h-5 w-5 shrink-0 rounded-[var(--radius-sm)] border border-border bg-surface-raised',
            'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        >
          <RadixCheckbox.Indicator className="flex items-center justify-center text-accent-foreground">
            ✓
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label htmlFor={inputId} className="text-sm text-text-primary">
          {label}
        </label>
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
