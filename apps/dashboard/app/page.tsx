'use client';

import { Button, Card, Link, Skeleton } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api-client';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

interface SalonMembership {
  salonId: string;
  salonName: string;
  role: string;
}

export default function DashboardHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [memberships, setMemberships] = useState<SalonMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    apiFetch<CurrentUser>('/auth/me')
      .then((currentUser) => {
        setUser(currentUser);
        return apiFetch<SalonMembership[]>('/auth/my-salons');
      })
      .then(setMemberships)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
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
      <main className="p-8">
        <Skeleton className="h-24 w-full max-w-md" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="p-8">
      <Card className="max-w-md">
        <h1 className="text-xl font-semibold text-text-primary">Welcome, {user.fullName}</h1>
        <p className="text-sm text-text-secondary">{user.email}</p>
        {user.isSuperadmin ? (
          <p className="mt-4 text-sm">
            <Link href="/superadmin/salons">Manage salons →</Link>
          </p>
        ) : null}
        {memberships.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.salonId} className="text-sm">
                <Link href={`/salon/${m.salonId}/reservations`}>{m.salonName} — Reservations →</Link>
              </li>
            ))}
          </ul>
        ) : !user.isSuperadmin ? (
          <p className="mt-2 text-sm text-text-secondary">
            You are not a member of any salon yet.
          </p>
        ) : null}
        <Button variant="secondary" className="mt-4" onClick={handleLogout} loading={loggingOut}>
          Log out
        </Button>
      </Card>
    </main>
  );
}
