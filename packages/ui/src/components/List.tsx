import type { HTMLAttributes, LiHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn('flex flex-col divide-y divide-border', className)} {...props} />;
}

export function ListItem({ className, ...props }: LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn('flex items-center justify-between gap-4 py-3', className)} {...props} />
  );
}
