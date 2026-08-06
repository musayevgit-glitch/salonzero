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

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  city: string | null;
  timezone: string;
  createdAt: string;
}

export default function DashboardHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [memberships, setMemberships] = useState<SalonMembership[]>([]);
  const [salons, setSalons] = useState<SalonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let resolvedUser: CurrentUser;
    apiFetch<CurrentUser>('/auth/me')
      .then((currentUser) => {
        resolvedUser = currentUser;
        setUser(currentUser);
        return apiFetch<SalonMembership[]>('/auth/my-salons');
      })
      .then((myMemberships) => {
        setMemberships(myMemberships);
        if (resolvedUser.isSuperadmin) {
          return apiFetch<{ items: SalonListItem[] }>('/salons?pageSize=100');
        }
        return null;
      })
      .then((salonsRes) => {
        if (salonsRes) {
          setSalons(salonsRes.items);
        }
      })
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
          <div className="mt-4 border-b border-border pb-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Platform Administration</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              <li>
                <Link href="/superadmin/salons">Manage salons →</Link>
              </li>
              <li>
                <Link href="/superadmin/reports">Platform reports →</Link>
              </li>
              <li>
                <Link href="/superadmin/audit-logs">Audit log →</Link>
              </li>
            </ul>
          </div>
        ) : null}

        {user.isSuperadmin && salons.length > 0 && (
          <div className="mt-4 border-b border-border pb-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Salon Dashboards</p>
            <ul className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
              {salons.map((s) => (
                <li key={s.id} className="text-sm flex flex-col gap-0.5">
                  <Link href={`/salon/${s.id}/reservations`} className="font-semibold">
                    {s.name} ({s.city ?? 'No City'}) →
                  </Link>
                  <div className="flex gap-2">
                    <Link href={`/salon/${s.id}/reports`} className="text-muted-foreground pl-4 text-xs">
                      Reports →
                    </Link>
                    <Link href={`/salon/${s.id}/audit-logs`} className="text-muted-foreground text-xs">
                      Audit log →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {memberships.length > 0 && !user.isSuperadmin ? (
          <div className="mt-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">My Salons</p>
            <ul className="mt-2 flex flex-col gap-2">
              {memberships.map((m) => (
                <li key={m.salonId} className="text-sm flex flex-col gap-0.5">
                  <Link href={`/salon/${m.salonId}/reservations`}>
                    {m.salonName} — Reservations →
                  </Link>
                  {m.role === 'SALON_ADMIN' && (
                    <div className="flex gap-2">
                      <Link
                        href={`/salon/${m.salonId}/reports`}
                        className="text-muted-foreground pl-4 text-xs"
                      >
                        Reports →
                      </Link>
                      <Link
                        href={`/salon/${m.salonId}/audit-logs`}
                        className="text-muted-foreground text-xs"
                      >
                        Audit log →
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : !user.isSuperadmin ? (
          <p className="mt-2 text-sm text-text-secondary">You are not a member of any salon yet.</p>
        ) : null}
        
        <Button variant="secondary" className="mt-6" onClick={handleLogout} loading={loggingOut}>
          Log out
        </Button>
      </Card>
    </main>
  );
}
