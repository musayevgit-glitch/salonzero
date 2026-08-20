'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '../../../../lib/api-client';
import { formatLongDateTime } from '../../../../lib/format-date';

const PAGE_SIZE = 20;

interface NotificationPayload {
  title?: string;
  message?: string;
  reservationId?: string;
  salonName?: string | null;
  serviceName?: string | null;
  startAt?: string;
  stylistName?: string | null;
  reminderType?: '1h' | '15m';
}

interface NotificationItem {
  id: string;
  type: string;
  payload: NotificationPayload | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationList {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
}

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: NotificationList };

/**
 * Known types get a translated heading so the inbox reads in the visitor's language, regardless of
 * the language the row was written in. Types written before the inbox existed (and any future
 * type this map has not caught up with) fall back to the payload's own title.
 */
const TITLE_KEY_BY_TYPE: Record<string, string> = {
  REMINDER_1H: 'typeReminder1h',
  REMINDER_15M: 'typeReminder15m',
  CANCELLED: 'typeCancelled',
  'reservation.cancelled_by_customer': 'typeCancelled',
  'reservation.confirmed': 'typeConfirmed',
  'reservation.pending_customer': 'typePending',
};

export function NotificationsClient() {
  const t = useTranslations('notifications');
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
    try {
      const data = await apiFetch<NotificationList>(
        `/customer/notifications?page=${targetPage}&pageSize=${PAGE_SIZE}`,
      );
      setState({ kind: 'ready', data });
    } catch {
      setState({ kind: 'error', message: t('loadError') });
    }
  }, [t]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  /**
   * Marks one notification read. The row is updated locally first so the click feels immediate;
   * a failed request reloads the page of data rather than leaving the optimistic state in place.
   */
  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    setState((prev) =>
      prev.kind === 'ready'
        ? {
            kind: 'ready',
            data: {
              ...prev.data,
              unreadCount: Math.max(0, prev.data.unreadCount - 1),
              items: prev.data.items.map((n) =>
                n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            },
          }
        : prev,
    );
    try {
      await apiFetch(`/customer/notifications/${item.id}/read`, { method: 'POST' });
    } catch {
      void load(page);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiFetch('/customer/notifications/read-all', { method: 'POST' });
      await load(page);
    } catch {
      setState({ kind: 'error', message: t('loadError') });
    } finally {
      setMarkingAll(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ height: 84, borderRadius: 14, background: '#f3e8ff', animation: 'sz-pulse 1.4s ease-in-out infinite' }}
          />
        ))}
        <style>{`@keyframes sz-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }`}</style>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem 1.15rem', borderRadius: 14 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{state.message}</p>
        <button type="button" onClick={() => void load(page)} className="sz-notif-btn" style={{ marginTop: '0.75rem' }}>
          {t('retry')}
          <style>{BUTTON_CSS}</style>
        </button>
      </div>
    );
  }

  const { items, total, unreadCount } = state.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b5d8a' }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#1e1b2e' }}>{t('empty')}</p>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem' }}>{t('emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || markingAll}
          className="sz-notif-btn"
        >
          {markingAll ? t('markingAll') : t('markAllRead')}
        </button>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map((item) => {
          const p = item.payload ?? {};
          const titleKey = TITLE_KEY_BY_TYPE[item.type];
          const title = titleKey ? t(titleKey) : (p.title ?? t('typeGeneric'));
          const unread = item.readAt === null;
          const detail = [p.salonName, p.serviceName, p.stylistName].filter(Boolean).join(' · ');

          return (
            <li key={item.id}>
              <article
                className={unread ? 'sz-notif sz-notif-unread' : 'sz-notif'}
                aria-label={unread ? `${t('unread')}: ${title}` : title}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: unread ? 700 : 600, color: '#1e1b2e' }}>
                      {title}
                    </h2>
                    {p.message ? (
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.86rem', color: '#4a3f6b' }}>{p.message}</p>
                    ) : null}
                    {detail ? (
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#6b5d8a' }}>{detail}</p>
                    ) : null}
                    {p.startAt ? (
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#6b5d8a' }}>
                        {formatLongDateTime(p.startAt, locale)}
                      </p>
                    ) : null}
                    <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: '#8b7fae' }}>
                      {formatLongDateTime(item.createdAt, locale)}
                    </p>
                  </div>

                  {unread ? (
                    <span
                      aria-hidden="true"
                      style={{ width: 9, height: 9, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 6 }}
                    />
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.7rem' }}>
                  {unread ? (
                    <button type="button" onClick={() => void markRead(item)} className="sz-notif-btn">
                      {t('markRead')}
                    </button>
                  ) : null}
                  {p.reservationId ? (
                    <a
                      href={`/account/reservations/${p.reservationId}`}
                      onClick={() => void markRead(item)}
                      className="sz-notif-link"
                    >
                      {t('viewReservation')}
                    </a>
                  ) : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label={t('title')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
        >
          <button
            type="button"
            className="sz-notif-btn"
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            disabled={page <= 1}
          >
            {t('previous')}
          </button>
          <span style={{ fontSize: '0.85rem', color: '#4a3f6b' }}>
            {t('pageInfo', { page, pages: totalPages })}
          </span>
          <button
            type="button"
            className="sz-notif-btn"
            onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
            disabled={page >= totalPages}
          >
            {t('next')}
          </button>
        </nav>
      ) : null}

      <style>{`
        .sz-notif {
          background: white;
          border: 1px solid #e4d4f4;
          border-radius: 14px;
          padding: 1rem 1.1rem;
        }
        .sz-notif-unread {
          background: #faf5ff;
          border-color: #c4b5fd;
        }
      `}</style>
      <style>{BUTTON_CSS}</style>
    </div>
  );
}

const BUTTON_CSS = `
  .sz-notif-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0.45rem 0.9rem;
    border-radius: 10px;
    border: 1.5px solid #7c3aed;
    background: white;
    color: #7c3aed;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .sz-notif-btn:hover:not(:disabled) { background: #f3e8ff; }
  .sz-notif-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sz-notif-btn:focus-visible,
  .sz-notif-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
  .sz-notif-link {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0.45rem 0.9rem;
    border-radius: 10px;
    background: #7c3aed;
    color: white;
    font-size: 0.82rem;
    font-weight: 600;
    text-decoration: none;
  }
  .sz-notif-link:hover { background: #6d28d9; }
`;
