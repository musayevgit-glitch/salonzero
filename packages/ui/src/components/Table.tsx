import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  className?: string;
}

// Desktop-only presentation; pair with MobileRecordList below `md` per responsive-strategy.md.
export function Table<T>({ columns, rows, getRowKey, className }: TableProps<T>) {
  return (
    <div
      className={cn(
        'hidden overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface-raised shadow-[var(--shadow-sm)] md:block',
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted text-text-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="whitespace-nowrap border-b border-border px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="transition-colors duration-[var(--duration-fast)] hover:bg-surface"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3.5 text-text-primary">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
