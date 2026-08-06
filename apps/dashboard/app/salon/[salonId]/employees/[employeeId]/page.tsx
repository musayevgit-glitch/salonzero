'use client';

import {
  Badge,
  Breadcrumbs,
  Card,
  ErrorState,
  PermissionDeniedState,
  Skeleton,
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
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
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
  }, [salonId, employeeId, router]);

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
      </Card>
    </main>
  );
}
