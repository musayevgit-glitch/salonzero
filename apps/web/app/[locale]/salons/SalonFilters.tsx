'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dropdown, SecondaryButton } from '../../_components/Dropdown';

export interface SalonFilterValues {
  search: string;
  city: string;
  genderFocus: string;
  sort: string;
}

const DEFAULTS: SalonFilterValues = {
  search: '',
  city: '',
  genderFocus: '',
  sort: 'name_asc',
};

function buildQuery(values: SalonFilterValues): string {
  const params = new URLSearchParams();
  if (values.search.trim()) params.set('search', values.search.trim());
  if (values.city.trim()) params.set('city', values.city.trim());
  if (values.genderFocus) params.set('genderFocus', values.genderFocus);
  if (values.sort && values.sort !== DEFAULTS.sort) params.set('sort', values.sort);
  const qs = params.toString();
  return qs ? `/salons?${qs}` : '/salons';
}

/**
 * Filter bar for the public salon listing.
 *
 * Text inputs auto-apply after a 300 ms debounce (no submit button); dropdowns apply
 * immediately. Navigation uses `router.replace` so the browser Back button still leaves
 * the listing instead of walking back through every keystroke.
 */
export function SalonFilters({ initial }: { initial: SalonFilterValues }) {
  const t = useTranslations('salons');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<SalonFilterValues>(initial);
  // Tracks the URL currently reflected in the address bar so neither the debounce nor an
  // immediate select change navigates to a URL we are already on. Seeded from the
  // server-rendered values, which also stops the first render from re-navigating.
  const appliedUrl = useRef(buildQuery(initial));

  function apply(next: SalonFilterValues) {
    const url = buildQuery(next);
    if (url === appliedUrl.current) return;
    appliedUrl.current = url;
    startTransition(() => {
      router.replace(url);
    });
  }

  // Free-text fields auto-apply 300 ms after the last keystroke; selects apply immediately.
  useEffect(() => {
    const url = buildQuery(values);
    if (url === appliedUrl.current) return;
    const timer = setTimeout(() => {
      appliedUrl.current = url;
      startTransition(() => {
        router.replace(url);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [values, router]);

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Prominent, full-width search — the primary way people narrow this listing. */}
      <div className="sz-search-shell">
        <svg
          width="19"
          height="19"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, color: '#6A5ACD' }}
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <label htmlFor="salon-search" className="sz-visually-hidden">
          {t('searchLabel')}
        </label>
        <input
          id="salon-search"
          type="search"
          value={values.search}
          onChange={(e) => setValues((v) => ({ ...v, search: e.target.value }))}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
        />
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e4d4f4',
          padding: '1.1rem 1.25rem',
          marginTop: '1rem',
          boxShadow: '0 1px 4px rgba(30,27,46,0.06)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div
            style={{
              flex: '1 1 160px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              minWidth: 0,
            }}
          >
            <label
              htmlFor="salon-city"
              style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e1b2e' }}
            >
              {t('filterCity')}
            </label>
            <input
              id="salon-city"
              type="search"
              value={values.city}
              onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
              placeholder={t('filterCity')}
              autoComplete="off"
              className="sz-filter-input"
              style={{
                height: 44,
                boxSizing: 'border-box',
                padding: '0 1rem',
                borderRadius: 10,
                border: '1px solid #e4d4f4',
                outline: 'none',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                width: '100%',
              }}
            />
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <Dropdown
            label={t('filterGender')}
            value={values.genderFocus}
            onChange={(e) => {
              const next = { ...values, genderFocus: e.target.value };
              setValues(next);
              apply(next);
            }}
            options={[
              { value: '', label: t('genderAny') },
              { value: 'Women', label: t('genderWomen') },
              { value: 'Men', label: t('genderMen') },
              { value: 'Unisex', label: t('genderUnisex') },
            ]}
          />
        </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <Dropdown
              label={t('filterSort')}
              value={values.sort}
              onChange={(e) => {
                const next = { ...values, sort: e.target.value };
                setValues(next);
                apply(next);
              }}
              options={[
                { value: 'name_asc', label: t('sortNameAsc') },
                { value: 'name_desc', label: t('sortNameDesc') },
                { value: 'newest', label: t('sortNewest') },
              ]}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: 44 }}>
            <SecondaryButton
              onClick={() => {
                setValues(DEFAULTS);
                apply(DEFAULTS);
              }}
            >
              {t('resetFilters')}
            </SecondaryButton>
          </div>
        </div>

        <p
          aria-live="polite"
          style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#7c6fa0', minHeight: '1rem' }}
        >
          {isPending ? tc('searching') : ''}
        </p>
      </div>

      <style>{`
        .sz-search-shell {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 14px;
          padding: 0.6rem 1.1rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          box-sizing: border-box;
        }
        .sz-search-shell:focus-within {
          border-color: #6A5ACD;
          box-shadow: 0 0 0 3px rgba(106,90,205,0.18);
        }
        .sz-search-shell input {
          flex: 1;
          min-width: 0;
          height: 36px;
          border: none;
          outline: none;
          background: none;
          font-family: inherit;
          font-size: 0.95rem;
          color: #1e1b2e;
        }
        .sz-visually-hidden {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0);
          white-space: nowrap; border: 0;
        }
        .sz-filter-input:hover { border-color: #c4b5fd; }
        .sz-filter-input:focus-visible {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.25);
        }
      `}</style>
    </div>
  );
}
