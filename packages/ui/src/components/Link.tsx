import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '../utils/cn';

export function Link({ className, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink
      className={cn(
        'text-accent underline-offset-4 hover:underline',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        className,
      )}
      {...props}
    />
  );
}
