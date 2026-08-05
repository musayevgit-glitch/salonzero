import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface MobileRecordListProps<T> {
  rows: T[];
  getRowKey: (row: T) => string;
  renderPrimary: (row: T) => ReactNode;
  renderSecondary?: (row: T) => ReactNode;
  renderAction?: (row: T) => ReactNode;
  className?: string;
}

// Mobile alternative to Table below `md`; never truncates the primary field (docs/design/responsive-strategy.md).
export function MobileRecordList<T>({
  rows,
  getRowKey,
  renderPrimary,
  renderSecondary,
  renderAction,
  className,
}: MobileRecordListProps<T>) {
  return (
    <ul className={cn('flex flex-col gap-2 md:hidden', className)}>
      {rows.map((row) => (
        <li
          key={getRowKey(row)}
          className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text-primary">{renderPrimary(row)}</p>
            {renderSecondary ? (
              <p className="truncate text-sm text-text-secondary">{renderSecondary(row)}</p>
            ) : null}
          </div>
          {renderAction ? <div className="shrink-0">{renderAction(row)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
