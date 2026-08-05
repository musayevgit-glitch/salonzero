'use client';

import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface DropdownMenuItemDef {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItemDef[];
}

export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>{trigger}</RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            'z-[var(--z-navigation)] min-w-40 rounded-[var(--radius-md)] border border-border',
            'bg-surface-raised p-1 shadow-[var(--shadow-md)]',
          )}
        >
          {items.map((item) => (
            <RadixDropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                'cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none',
                'data-[highlighted]:bg-surface',
                item.destructive ? 'text-danger' : 'text-text-primary',
              )}
            >
              {item.label}
            </RadixDropdownMenu.Item>
          ))}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}
