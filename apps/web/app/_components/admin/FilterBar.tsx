import type { ReactNode } from 'react';

export interface FilterBarProps {
  /** Search input (or any element that should take the flexible column). */
  search?: ReactNode;
  /** Selects, date pickers, toggles. */
  children?: ReactNode;
  /** Right-aligned trailing content, e.g. a result count or reset link. */
  trailing?: ReactNode;
}

/** Search + filters row shown above every admin list view. */
export function FilterBar({ search, children, trailing }: FilterBarProps) {
  return (
    <div className="filter-bar" role="search">
      {search ? <div className="filter-bar-search">{search}</div> : null}
      {children}
      {trailing ? <div className="sm:ml-auto">{trailing}</div> : null}
    </div>
  );
}
