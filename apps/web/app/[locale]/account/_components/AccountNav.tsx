'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function AccountNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const NAV_LINKS = [
    { href: '/account', label: t('profile'), exact: true },
    { href: '/account/reservations', label: t('reservations'), exact: false },
  ];
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto border-b border-border">
      {NAV_LINKS.map((link) => {
        const active = pathname
          ? link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          : false;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'border-b-2 px-3 py-2 text-sm font-medium no-underline transition-colors',
              active
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
