'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface TabDef {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: TabDef[];
  defaultValue?: string;
}

export function Tabs({ tabs, defaultValue }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <RadixTabs.List className="flex gap-1 border-b border-border" aria-label="Tabs">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-text-secondary',
              'data-[state=active]:border-accent data-[state=active]:text-text-primary',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.value} value={tab.value} className="pt-4">
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
