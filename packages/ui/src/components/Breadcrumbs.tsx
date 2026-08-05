import { Fragment } from 'react';
import { Link } from './Link';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? (
              <span aria-hidden="true" className="text-border">
                /
              </span>
            ) : null}
            <li>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page" className="text-text-primary">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
