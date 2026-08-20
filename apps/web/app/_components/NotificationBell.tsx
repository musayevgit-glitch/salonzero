'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '../../lib/api-client';

/** How often the badge re-checks. Long enough not to be chatty, short enough to feel live. */
const POLL_INTERVAL_MS = 60_000;

/** Beyond this the badge shows "9+" rather than growing and breaking the header layout. */
const BADGE_MAX = 9;

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Header bell with an unread badge.
 *
 * Rendered only for signed-in visitors — the count endpoint is authenticated, and polling it
 * while signed out would produce a redirect loop through `apiFetch`'s 401 handling. A failed poll
 * is swallowed on purpose: a transient network error should hide the badge, not bounce the user
 * out of the page they are on.
 */
export function NotificationBell() {
  const t = useTranslations('notifications');
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await apiFetch<{ count: number }>('/customer/notifications/unread-count');
        if (!cancelled) setCount(res.count ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const hasUnread = count > 0;

  return (
    <a
      href="/account/notifications"
      className="sz-bell"
      aria-label={hasUnread ? t('unreadBadge', { count }) : t('bellLabel')}
    >
      <BellIcon />
      {hasUnread ? (
        <span className="sz-bell-badge" aria-hidden="true">
          {count > BADGE_MAX ? `${BADGE_MAX}+` : count}
        </span>
      ) : null}

      <style>{`
        .sz-bell {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          color: #4a3f6b;
          background: transparent;
          text-decoration: none;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .sz-bell:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-bell:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-bell-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 999px;
          background: #dc2626;
          color: white;
          font-size: 0.62rem;
          font-weight: 700;
          line-height: 17px;
          text-align: center;
          border: 2px solid white;
          box-sizing: content-box;
        }
      `}</style>
    </a>
  );
}
