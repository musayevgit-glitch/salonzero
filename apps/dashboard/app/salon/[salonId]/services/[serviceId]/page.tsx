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
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface ServiceDetail {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; service: ServiceDetail };

function formatPrice(priceAmount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    priceAmount / 100,
  );
}

export default function ServiceDetailPage() {
  const router = useRouter();
  const { salonId, serviceId } = useParams<{ salonId: string; serviceId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  function load() {
    apiFetch<ServiceDetail>(`/salons/${salonId}/services/${serviceId}`)
      .then((service) => setState({ kind: 'ready', service }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/services/${serviceId}`);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }

  useEffect(load, [salonId, serviceId, router]);

  async function handleLifecycleConfirm() {
    if (state.kind !== 'ready') return;
    setLifecycleBusy(true);
    const action = state.service.isActive ? 'deactivate' : 'activate';
    try {
      await apiFetch(`/salons/${salonId}/services/${serviceId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showToast(action === 'deactivate' ? 'Service deactivated' : 'Service activated');
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

  if (state.kind === 'permission-denied') {
    return (
      <main className="p-8">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="p-8">
        <ErrorState title="Couldn't load this service" description={state.message} />
      </main>
    );
  }

  const { service } = state;

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[{ label: 'Services', href: `/salon/${salonId}/services` }, { label: service.name }]}
      />
      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{service.name}</h1>
          <Badge tone={service.isActive ? 'success' : 'neutral'}>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {service.description ? (
          <p className="mt-4 text-sm text-text-secondary">{service.description}</p>
        ) : null}

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">Price</dt>
            <dd>{formatPrice(service.priceAmount, service.currency)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">Duration</dt>
            <dd>{service.durationMinutes} min</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">Buffer</dt>
            <dd>{service.bufferMinutes} min</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/salon/${salonId}/services/${service.id}/edit`}>Edit</Link>
          <Button
            variant={service.isActive ? 'destructive' : 'secondary'}
            onClick={() => setConfirmOpen(true)}
          >
            {service.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={service.isActive ? 'Deactivate this service?' : 'Activate this service?'}
        description={
          service.isActive
            ? 'It will no longer be bookable. This does not affect existing reservations.'
            : 'It will become bookable again.'
        }
        confirmLabel={service.isActive ? 'Deactivate' : 'Activate'}
        destructive={service.isActive}
        confirming={lifecycleBusy}
        onConfirm={handleLifecycleConfirm}
      />
    </main>
  );
}
