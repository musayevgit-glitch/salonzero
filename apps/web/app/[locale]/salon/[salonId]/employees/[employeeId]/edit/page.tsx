'use client';

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  PermissionDeniedState,
  Skeleton,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../../lib/api-client';

interface EmployeeDetail {
  id: string;
  fullName: string;
  bio: string | null;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; employee: EmployeeDetail };

export default function EditEmployeePage() {
  const router = useRouter();
  const { salonId, employeeId } = useParams<{ salonId: string; employeeId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<EmployeeDetail>(`/salons/${salonId}/employees/${employeeId}`)
      .then((employee) => {
        setState({ kind: 'ready', employee });
        setFullName(employee.fullName);
        setBio(employee.bio ?? '');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/employees/${employeeId}/edit`);
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
  }, [salonId, employeeId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/employees/${employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          bio: bio || null,
          expectedUpdatedAt: state.employee.updatedAt,
        }),
      });
      showToast('Employee updated');
      router.push(`/salon/${salonId}/employees/${employeeId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('This employee was changed by someone else. Reload the page and try again.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-64 w-full max-w-lg" />
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
        <ErrorState title="Couldn't load this employee" description={state.message} />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: 'Employees', href: `/salon/${salonId}/employees` },
          { label: state.employee.fullName, href: `/salon/${salonId}/employees/${employeeId}` },
          { label: 'Edit' },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">Edit employee</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label="Full name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Bio" optional>
            {(fieldProps) => (
              <Textarea {...fieldProps} value={bio} onChange={(e) => setBio(e.target.value)} />
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </main>
  );
}
