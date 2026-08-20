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
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e4d4f4',
        padding: '1.5rem',
        marginBottom: '2.5rem',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div
          style={{
            flex: '1 1 220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            minWidth: 0,
          }}
        >
          <label
            htmlFor="salon-search"
            style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}
          >
            {t('searchPlaceholder')}
          </label>
          <input
            id="salon-search"
            type="search"
            value={values.search}
            onChange={(e) => setValues((v) => ({ ...v, search: e.target.value }))}
            placeholder={t('searchPlaceholder')}
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
            style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}
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
        style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#7c6fa0', minHeight: '1rem' }}
      >
        {isPending ? tc('searching') : ''}
      </p>

      <style>{`
        .sz-filter-input:hover { border-color: #c4b5fd; }
        .sz-filter-input:focus-visible {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.25);
        }
      `}</style>
    </div>
  );
}
