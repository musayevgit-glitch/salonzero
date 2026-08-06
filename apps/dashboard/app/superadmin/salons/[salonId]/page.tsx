'use client';

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Link,
  PermissionDeniedState,
  Skeleton,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface SalonDetail {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  city: string | null;
  timezone: string;
  description: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  subdomain: string | null;
  customDomain: string | null;
  genderFocus: string | null;
  activeMembershipCount: number;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; salon: SalonDetail };

export default function SuperadminSalonDetailPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  function load() {
    apiFetch<SalonDetail>(`/salons/${salonId}`)
      .then((salon) => setState({ kind: 'ready', salon }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/superadmin/salons/${salonId}`);
          return;
        }
        // The API deliberately returns 404 both when the caller lacks access and when the salon
        // truly doesn't exist — we can't and shouldn't distinguish them in the UI either.
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not-found' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }

  useEffect(load, [salonId, router]);

  async function handleLifecycleConfirm() {
    if (state.kind !== 'ready') return;
    setLifecycleBusy(true);
    const action = state.salon.status === 'ACTIVE' ? 'suspend' : 'restore';
    try {
      await apiFetch(`/salons/${salonId}/${action}`, { method: 'POST', body: JSON.stringify({}) });
      showToast(action === 'suspend' ? 'Salon suspended' : 'Salon restored');
      setConfirmOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    } finally {
      setLifecycleBusy(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="p-8">
        <Skeleton className="h-48 w-full max-w-lg" />
      </main>
    );
  }

  if (state.kind === 'permission-denied' || state.kind === 'not-found') {
    return (
      <main className="p-8">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="p-8">
        <ErrorState title="Couldn't load this salon" description={state.message} />
      </main>
    );
  }

  const { salon } = state;
  const isActive = salon.status === 'ACTIVE';

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[{ label: 'Salons', href: '/superadmin/salons' }, { label: salon.name }]}
      />
      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{salon.name}</h1>
          <Badge tone={isActive ? 'success' : 'neutral'}>{salon.status}</Badge>
        </div>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="shrink-0 text-text-secondary">Slug</dt>
            <dd className="min-w-0 break-all text-right text-text-primary">{salon.slug}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="shrink-0 text-text-secondary">Timezone</dt>
            <dd className="text-text-primary">{salon.timezone}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="shrink-0 text-text-secondary">City</dt>
            <dd className="text-text-primary">{salon.city ?? '—'}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="shrink-0 text-text-secondary">Subdomain</dt>
            <dd className="min-w-0 break-all text-right text-text-primary">
              {salon.subdomain ?? '—'}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="shrink-0 text-text-secondary">Active staff</dt>
            <dd className="text-text-primary">{salon.activeMembershipCount}</dd>
          </div>
        </dl>
        {salon.description ? (
          <p className="mt-4 text-sm text-text-secondary">{salon.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/superadmin/salons/${salon.id}/edit`}>Edit</Link>
          <Button
            variant={isActive ? 'destructive' : 'secondary'}
            onClick={() => setConfirmOpen(true)}
          >
            {isActive ? 'Suspend' : 'Restore'}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isActive ? 'Suspend this salon?' : 'Restore this salon?'}
        description={
          isActive
            ? 'Its own staff will immediately lose access, and it disappears from public/customer-facing views once those exist. This does not affect existing data.'
            : 'Staff access and public visibility will be restored.'
        }
        confirmLabel={isActive ? 'Suspend' : 'Restore'}
        destructive={isActive}
        confirming={lifecycleBusy}
        onConfirm={handleLifecycleConfirm}
      />
    </main>
  );
}
