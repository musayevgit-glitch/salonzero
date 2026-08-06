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
      showToast(action === 'deactivate' ? 'Employee deactivated' : 'Employee activated');
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
        <ErrorState title="Couldn't load this employee" description={state.message} />
      </main>
    );
  }

  const { employee } = state;

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: 'Employees', href: `/salon/${salonId}/employees` },
          { label: employee.fullName },
        ]}
      />
      <Card className="max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">{employee.fullName}</h1>
          <Badge tone={employee.isActive ? 'success' : 'neutral'}>
            {employee.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {employee.bio ? <p className="mt-4 text-sm text-text-secondary">{employee.bio}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/salon/${salonId}/employees/${employee.id}/edit`}>Edit</Link>
          <Button
            variant={employee.isActive ? 'destructive' : 'secondary'}
            onClick={() => setConfirmOpen(true)}
          >
            {employee.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={employee.isActive ? 'Deactivate this employee?' : 'Activate this employee?'}
        description={
          employee.isActive
            ? 'They will no longer be bookable for services. This does not affect existing reservations.'
            : 'They will become bookable again.'
        }
        confirmLabel={employee.isActive ? 'Deactivate' : 'Activate'}
        destructive={employee.isActive}
        confirming={lifecycleBusy}
        onConfirm={handleLifecycleConfirm}
      />
    </main>
  );
}
