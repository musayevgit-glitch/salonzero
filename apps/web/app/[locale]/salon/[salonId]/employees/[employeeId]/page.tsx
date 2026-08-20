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
import { PortfolioGallery } from './portfolio-gallery';
import { PhotoUpload } from './photo-upload';
import { ServiceAssignment } from './service-assignment';
import { WorkingScheduleEditor } from './working-schedule';
import { BreaksEditor } from './breaks';
import { TimeOffEditor } from './time-off';

interface EmployeeDetail {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; employee: EmployeeDetail };

export default function EmployeeDetailPage() {
  const router = useRouter();
  const { salonId, employeeId } = useParams<{ salonId: string; employeeId: string }>();
  const { showToast } = useToast();
  const t = useTranslations('salonAdmin');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  function load() {
    apiFetch<EmployeeDetail>(`/salons/${salonId}/employees/${employeeId}`)
      .then((employee) => setState({ kind: 'ready', employee }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/employees/${employeeId}`);
          return;
        }
        // 404 covers "not authorized" and "doesn't exist / belongs to another salon" identically —
        // no existence leakage (docs/security/authorization.md).
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

  useEffect(load, [salonId, employeeId, router]);

  async function handleLifecycleConfirm() {
    if (state.kind !== 'ready') return;
    setLifecycleBusy(true);
    const action = state.employee.isActive ? 'deactivate' : 'activate';
    try {
      await apiFetch(`/salons/${salonId}/employees/${employeeId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      showToast(action === 'deactivate' ? t('employees.deactivated') : t('employees.activated'));
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
        <ErrorState title={t('employees.errorLoadOne')} description={state.message} />
      </main>
    );
  }

  const { employee } = state;

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: t('employees.title'), href: `/salon/${salonId}/employees` },
          { label: employee.fullName },
        ]}
      />
      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{employee.fullName}</h1>
          <Badge tone={employee.isActive ? 'success' : 'neutral'}>
            {employee.isActive ? t('employees.active') : t('employees.inactive')}
          </Badge>
        </div>
        {employee.bio ? <p className="mt-4 text-sm text-text-secondary">{employee.bio}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/salon/${salonId}/employees/${employee.id}/edit`}
            className="btn-lg btn-lg-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium rounded-[var(--radius-lg)] no-underline hover:no-underline"
          >
            {t('common.edit')}
          </Link>
          <Button
            variant={employee.isActive ? 'destructive' : 'secondary'}
            onClick={() => setConfirmOpen(true)}
          >
            {employee.isActive ? t('employees.deactivate') : t('employees.activate')}
          </Button>
        </div>
      </Card>

      <Card className="max-w-lg">
        <h2 className="text-lg font-semibold text-text-primary">{t('employees.profilePhoto')}</h2>
        <div className="mt-4">
          <PhotoUpload
            salonId={salonId}
            employeeId={employee.id}
            currentPhotoUrl={employee.photoUrl}
            onUpdate={load}
          />
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary">{t('employees.portfolio')}</h2>
        <div className="mt-4">
          <PortfolioGallery salonId={salonId} employeeId={employee.id} />
        </div>
      </Card>

      <Card className="max-w-lg">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('employees.eligibleServices')}
        </h2>
        <div className="mt-4">
          <ServiceAssignment salonId={salonId} employeeId={employee.id} />
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary">{t('employees.weeklySchedule')}</h2>
        <div className="mt-4">
          <WorkingScheduleEditor salonId={salonId} employeeId={employee.id} />
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary">{t('employees.breaks')}</h2>
        <div className="mt-4">
          <BreaksEditor salonId={salonId} employeeId={employee.id} />
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-lg font-semibold text-text-primary">{t('employees.timeOff')}</h2>
        <div className="mt-4">
          <TimeOffEditor salonId={salonId} employeeId={employee.id} />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={employee.isActive ? t('employees.deactivateTitle') : t('employees.activateTitle')}
        description={
          employee.isActive ? t('employees.deactivateDesc') : t('employees.activateDesc')
        }
        confirmLabel={employee.isActive ? t('employees.deactivate') : t('employees.activate')}
        destructive={employee.isActive}
        confirming={lifecycleBusy}
        onConfirm={handleLifecycleConfirm}
      />
    </main>
  );
}
