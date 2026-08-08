import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('terms');
  return { title: t('pageTitle') };
}

export default async function TermsPage() {
  const t = await getTranslations('terms');

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '2rem 1.25rem 4rem',
        fontFamily: 'inherit',
        color: '#1e1b2e',
        lineHeight: 1.7,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e1b2e', marginBottom: '0.5rem' }}>
          {t('title')}
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#7c6fa0' }}>{t('lastUpdated')}</p>
      </div>

      {/* Section helper */}
      {(
        [
          ['acceptance', t('acceptanceTitle'), t('acceptanceBody')],
          ['services', t('servicesTitle'), t('servicesBody')],
          ['reservations', t('reservationsTitle'), t('reservationsBody')],
          ['cancellation', t('cancellationTitle'), t('cancellationBody')],
          ['privacy', t('privacyTitle'), t('privacyBody')],
          ['liability', t('liabilityTitle'), t('liabilityBody')],
          ['changes', t('changesTitle'), t('changesBody')],
          ['contact', t('contactTitle'), t('contactBody')],
        ] as [string, string, string][]
      ).map(([key, heading, body]) => (
        <section key={key} style={{ marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#1e1b2e',
              marginBottom: '0.6rem',
              paddingBottom: '0.4rem',
              borderBottom: '2px solid #f3e8ff',
            }}
          >
            {heading}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#3d3555' }}>{body}</p>
        </section>
      ))}

      <div
        style={{
          marginTop: '3rem',
          padding: '1rem 1.25rem',
          borderRadius: 12,
          background: '#f3e8ff',
          border: '1px solid #e4d4f4',
        }}
      >
        <p style={{ fontSize: '0.82rem', color: '#6b5d8a', textAlign: 'center' }}>
          {t('footer')}
        </p>
      </div>
    </main>
  );
}
