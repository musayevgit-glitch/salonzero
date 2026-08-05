'use client';

import { Button, Card, Skeleton, PublicShell } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    apiFetch<CurrentUser>('/auth/me')
      .then(setUser)
      .catch((err) => {
        // Session-expired handling: bounce to login and remember where to come back to.
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/account');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  if (loading) {
    return (
      <PublicShell>
        <Skeleton className="h-24 w-full max-w-md" />
      </PublicShell>
    );
  }

  if (!user) return null; // redirect already in flight

  return (
    <PublicShell isAuthenticated>
      <Card className="max-w-md">
        <h1 className="text-xl font-semibold text-text-primary">{user.fullName}</h1>
        <p className="text-sm text-text-secondary">{user.email}</p>
        <Button variant="secondary" className="mt-4" onClick={handleLogout} loading={loggingOut}>
          Log out
        </Button>
      </Card>
    </PublicShell>
  );
}
