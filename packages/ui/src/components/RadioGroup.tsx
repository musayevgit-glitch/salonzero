'use client';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '../utils/cn';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps extends RadixRadioGroup.RadioGroupProps {
  options: RadioOption[];
}

export function RadioGroup({ options, className, ...props }: RadioGroupProps) {
  return (
    <RadixRadioGroup.Root className={cn('flex flex-col gap-2', className)} {...props}>
      {options.map((option) => {
        const inputId = `radio-${option.value}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <RadixRadioGroup.Item
              id={inputId}
              value={option.value}
              className={cn(
                'h-5 w-5 shrink-0 rounded-full border border-border bg-surface-raised',
                'data-[state=checked]:border-accent',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
              )}
            >
              <RadixRadioGroup.Indicator className="flex h-full w-full items-center justify-center after:h-2.5 after:w-2.5 after:rounded-full after:bg-accent" />
            </RadixRadioGroup.Item>
            <label htmlFor={inputId} className="text-sm text-text-primary">
              {option.label}
            </label>
          </div>
        );
      })}
    </RadixRadioGroup.Root>
  );
}
