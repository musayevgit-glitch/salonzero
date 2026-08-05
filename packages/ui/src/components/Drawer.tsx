'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
}

// Side-panel variant of Dialog (mobile navigation, filters) — same focus-trap guarantees from Radix.
export function Drawer({ open, onOpenChange, title, children }: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-drawer)] bg-black/40" />
        <RadixDialog.Content
          className={cn(
            'fixed inset-y-0 left-0 z-[var(--z-drawer)] w-[min(85vw,320px)]',
            'bg-surface-raised p-6 shadow-[var(--shadow-md)]',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
          )}
        >
          <RadixDialog.Title className="text-lg font-semibold text-text-primary">
            {title}
          </RadixDialog.Title>
          <div className="mt-4">{children}</div>
          <RadixDialog.Close asChild>
            <button
              aria-label="Close menu"
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
