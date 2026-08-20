'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { PageLayout } from '../../_components/PageLayout';
import Link from 'next/link';

interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingConsent: boolean;
  isSuperadmin?: boolean;
  managedSalons?: { id: string; name: string }[];
  isStylist?: boolean;
  stylistSalonId?: string | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: CustomerProfile };

export default function AccountProfilePage() {
  const router = useRouter();
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function load() {
    apiFetch<CustomerProfile>('/customer/profile')
      .then((profile) => {
        setState({ kind: 'ready', profile });
        setFullName(profile.fullName);
        setPhone(profile.phone ?? '');
        setMarketingConsent(profile.marketingConsent);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/account');
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : tc('error'),
        });
      });
  }

  useEffect(load, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedAt(null);
    try {
      const profile = await apiFetch<CustomerProfile>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone: phone || null, marketingConsent }),
      });
      setState({ kind: 'ready', profile });
      setSavedAt(Date.now());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?returnTo=/account');
        return;
      }
      setSaveError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  if (state.kind === 'loading') {
    return (
      <PageLayout activeNav="account" isAuthenticated={true}>
        <div
          role="status"
          aria-busy="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          <div className="sz-skel" style={{ height: 34, width: 180, borderRadius: 8 }} />
          <div className="sz-skel" style={{ height: 148, width: '100%', borderRadius: 20 }} />
          <div className="sz-skel" style={{ height: 260, width: '100%', borderRadius: 20 }} />
          <div className="sz-skel" style={{ height: 72, width: '100%', borderRadius: 16 }} />
        </div>
        <style>{`
          .sz-skel { background: #ede4f8; animation: szPulse 1.4s ease-in-out infinite; }
          @keyframes szPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </PageLayout>
    );
  }

  if (state.kind === 'error') {
    return (
      <PageLayout activeNav="account" isAuthenticated={true}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.5rem',
              color: '#1e1b2e',
              marginBottom: '1rem',
            }}
          >
            {tc('error')}
          </h1>
          <p style={{ color: '#7c6fa0' }}>{state.message}</p>
        </div>
      </PageLayout>
    );
  }

  const { profile } = state;

  const quickLinks: { href: string; label: string; icon: React.ReactNode }[] = [
    {
      href: '/account/reservations',
      label: t('myReservations'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 2.5v4M16 2.5v4M3 10h18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: '/account/notifications',
      label: t('notifications'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 10a6 6 0 1 1 12 0c0 3.8 1.2 5.4 1.2 5.4H4.8S6 13.8 6 10z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.5a2.2 2.2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  // Role-gated shortcuts. These are convenience links only — every destination re-checks
  // authorization server-side, so hiding a link is never the access control.
  if (profile.isSuperadmin) {
    quickLinks.push({
      href: '/superadmin',
      label: t('platformAdmin'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3l7.5 3.2v5c0 4.6-3.1 8.3-7.5 9.8-4.4-1.5-7.5-5.2-7.5-9.8v-5L12 3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ),
    });
  }
  if (profile.managedSalons && profile.managedSalons.length > 0) {
    quickLinks.push({
      href: '/salonadmin',
      label: t('salonAdminPanel'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 21V9.5L12 4l8 5.5V21"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ),
    });
  }
  if (profile.isStylist) {
    quickLinks.push({
      href: '/stilistadmin',
      label: t('stylistAdminPanel'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="6" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8.2 7.6 20 18M8.2 16.4 20 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ),
    });
  }

  return (
    <PageLayout activeNav="account" isAuthenticated={true}>
      <div className="sz-account">
        {/* Identity banner — a consumer profile, not a dashboard header. */}
        <section className="sz-acc-banner">
          <span className="sz-acc-avatar" aria-hidden="true">
            {getInitials(profile.fullName || profile.email)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 className="sz-acc-name">{profile.fullName}</h1>
            <p className="sz-acc-contact">{profile.email}</p>
            {profile.phone ? <p className="sz-acc-contact">{profile.phone}</p> : null}
          </div>
        </section>

        <nav aria-label={t('quickLinks')} className="sz-acc-links">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="sz-acc-link">
              <span className="sz-acc-link-icon">{link.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{link.label}</span>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M5.5 3.5 9 7l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSubmit} className="sz-acc-card">
          <h2 className="sz-acc-card-title">{t('profileInfo')}</h2>

          {saveError ? (
            <p role="alert" className="sz-acc-alert sz-acc-alert-err">
              {saveError}
            </p>
          ) : null}
          {savedAt ? (
            <p role="status" className="sz-acc-alert sz-acc-alert-ok">
              {t('savedSuccess')}
            </p>
          ) : null}

          <div className="sz-field">
            <label htmlFor="acc-fullname">{t('fullName')}</label>
            <input
              id="acc-fullname"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              autoComplete="name"
            />
          </div>

          <div className="sz-field">
            <label htmlFor="acc-phone">{t('phone')}</label>
            <input
              id="acc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              autoComplete="tel"
            />
          </div>

          <label className="sz-checkbox">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              disabled={saving}
            />
            {t('marketing')}
          </label>

          <button type="submit" disabled={saving} className="sz-acc-save">
            {saving ? t('saving') : t('saveBtn')}
          </button>
        </form>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          type="button"
          className="sz-acc-logout"
        >
          {loggingOut ? tc('loading') : t('logout')}
        </button>
      </div>

      <style>{`
        .sz-account {
          max-width: 640px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .sz-acc-banner {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          padding: 1.75rem 1.5rem;
          border-radius: 20px;
          background: linear-gradient(135deg, #faf7ff 0%, #f0ebff 55%, #faf7ff 100%);
          border: 1px solid #e4d4f4;
        }
        .sz-acc-avatar {
          width: 68px; height: 68px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #6A5ACD, #7c3aed);
          color: #fff; font-size: 1.3rem; font-weight: 700;
          box-shadow: 0 6px 18px rgba(106,90,205,0.30);
        }
        .sz-acc-name {
          margin: 0 0 0.25rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.5rem; font-weight: 700; color: #1e1b2e; line-height: 1.2;
          overflow-wrap: anywhere;
        }
        .sz-acc-contact { margin: 0; font-size: 0.88rem; color: #7c6fa0; overflow-wrap: anywhere; }

        .sz-acc-links { display: grid; grid-template-columns: 1fr; gap: 0.6rem; }
        .sz-acc-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 1rem 1.15rem;
          background: #fff; border: 1px solid #e4d4f4; border-radius: 14px;
          color: #1e1b2e; font-weight: 600; font-size: 0.92rem; text-decoration: none;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          transition: border-color 0.15s, transform 0.15s;
        }
        .sz-acc-link:hover { border-color: #c4b5fd; transform: translateY(-1px); }
        .sz-acc-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-acc-link-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: rgba(106,90,205,0.10); color: #6A5ACD;
        }

        .sz-acc-card {
          background: #fff; border: 1px solid #e4d4f4; border-radius: 20px;
          padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
        }
        .sz-acc-card-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e1b2e; }
        .sz-acc-alert { margin: 0; font-size: 0.85rem; padding: 0.7rem 0.9rem; border-radius: 10px; }
        .sz-acc-alert-err { color: #b91c1c; background: #fef2f2; }
        .sz-acc-alert-ok { color: #166534; background: #dcfce7; }
        .sz-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .sz-field label { font-size: 0.82rem; font-weight: 600; color: #4a3f6b; }
        .sz-field input {
          height: 46px; box-sizing: border-box; padding: 0 1rem;
          border: 1px solid #e4d4f4; border-radius: 10px;
          font-family: inherit; font-size: 0.95rem; color: #1e1b2e;
          background: #fff; outline: none;
        }
        .sz-field input:hover { border-color: #c4b5fd; }
        .sz-field input:focus-visible { border-color: #6A5ACD; box-shadow: 0 0 0 3px rgba(106,90,205,0.20); }
        .sz-field input:disabled { background: #f9f6f3; color: #9d92bd; }
        .sz-checkbox {
          display: flex; align-items: center; gap: 0.55rem;
          font-size: 0.86rem; color: #4a3f6b; cursor: pointer;
        }
        .sz-checkbox input { width: 17px; height: 17px; accent-color: #6A5ACD; }
        .sz-acc-save {
          margin-top: 0.25rem; height: 48px; border: none; border-radius: 12px;
          background: #6A5ACD; color: #fff; font-family: inherit;
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 8px 22px rgba(106,90,205,0.28);
        }
        .sz-acc-save:hover:enabled { background: #5c4cbe; }
        .sz-acc-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .sz-acc-logout {
          height: 48px; border-radius: 12px; background: #fff;
          border: 1px solid #e4d4f4; color: #7c6fa0;
          font-family: inherit; font-size: 0.92rem; font-weight: 600; cursor: pointer;
        }
        .sz-acc-logout:hover:enabled { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
        .sz-acc-logout:disabled { opacity: 0.6; cursor: not-allowed; }
        .sz-acc-save:focus-visible, .sz-acc-logout:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        @media (min-width: 560px) { .sz-acc-links { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </PageLayout>
  );
}
