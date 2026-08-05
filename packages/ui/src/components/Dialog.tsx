'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

// Radix traps and restores focus correctly by default (docs/design/design-principles.md motion rules
// still apply: overlay/content transitions are short and respect prefers-reduced-motion via tokens.css).
export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-dialog)] bg-black/40" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[var(--z-dialog)] w-[min(90vw,480px)] -translate-x-1/2 -translate-y-1/2',
            'rounded-[var(--radius-lg)] bg-surface-raised p-6 shadow-[var(--shadow-md)]',
            'focus:outline-none',
          )}
        >
          <RadixDialog.Title className="text-lg font-semibold text-text-primary">
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm text-text-secondary">
              {description}
            </RadixDialog.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
          <RadixDialog.Close asChild>
            <button
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-text-secondary hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              ✕
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
