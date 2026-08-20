import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageLayout } from '../../../_components/PageLayout';
import { NotificationsClient } from './NotificationsClient';

// The inbox is per-account; it must never be served from a shared cache.
export const dynamic = 'force-dynamic';

/**
 * Notification inbox.
 *
 * The cookie check here only avoids rendering a signed-out shell — the real authorization lives in
 * /api/customer/notifications, which scopes every read to the token's own user id.
 */
export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('notifications');

  const token = (await cookies()).get('token')?.value;
  if (!token) redirect(`/${locale}/login?returnTo=/account/notifications`);

  return (
    <PageLayout activeNav="account" isAuthenticated={true}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <header>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '2rem',
              color: '#1e1b2e',
              margin: 0,
            }}
          >
            {t('title')}
          </h1>
          <p style={{ margin: '0.4rem 0 0', color: '#6b5d8a', fontSize: '0.9rem' }}>
            {t('subtitle')}
          </p>
        </header>

        <NotificationsClient />
      </div>
    </PageLayout>
  );
}
