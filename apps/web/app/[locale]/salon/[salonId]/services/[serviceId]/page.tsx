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
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

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
  const t = useTranslations('salonAdmin');
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
      showToast(action === 'deactivate' ? t('services.deactivated') : t('services.activated'));
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
      <main className="dashboard-page">
        <Skeleton className="h-48 w-full max-w-lg" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="dashboard-page">
        <ErrorState title={t('services.errorLoadOne')} description={state.message} />
      </main>
    );
  }

  const { service } = state;

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[{ label: t('services.title'), href: `/salon/${salonId}/services` }, { label: service.name }]}
      />
      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{service.name}</h1>
          <Badge tone={service.isActive ? 'success' : 'neutral'}>
            {service.isActive ? t('services.active') : t('services.inactive')}
          </Badge>
        </div>
        {service.description ? (
          <p className="mt-4 text-sm text-text-secondary">{service.description}</p>
        ) : null}

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t('services.price')}</dt>
            <dd>{formatPrice(service.priceAmount, service.currency)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t('services.duration')}</dt>
            <dd>{service.durationMinutes} {t('common.minutes')}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t('services.buffer')}</dt>
            <dd>{service.bufferMinutes} {t('common.minutes')}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/salon/${salonId}/services/${service.id}/edit`}
            className="btn-lg btn-lg-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium rounded-[var(--radius-lg)] no-underline hover:no-underline"
          >
            {t('common.edit')}
          </Link>
          <Button
            variant={service.isActive ? 'destructive' : 'secondary'}
            onClick={() => setConfirmOpen(true)}
          >
            {service.isActive ? t('common.deactivate') : t('common.activate')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={service.isActive ? t('services.deactivateTitle') : t('services.activateTitle')}
        description={
          service.isActive
            ? t('services.deactivateDesc')
            : t('services.activateDesc')
        }
        confirmLabel={service.isActive ? t('common.deactivate') : t('common.activate')}
        destructive={service.isActive}
        confirming={lifecycleBusy}
        onConfirm={handleLifecycleConfirm}
      />
    </main>
  );
}
