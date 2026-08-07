'use client';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Link,
  PermissionDeniedState,
  Skeleton,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface ServiceCategory {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: ServiceCategory[] };

export default function ServiceCategoriesPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const basePath = `/salons/${salonId}/service-categories`;

  function load() {
    apiFetch<ServiceCategory[]>(basePath)
      .then((items) => setState({ kind: 'ready', items }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/service-categories`);
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

  useEffect(load, [salonId, router]);

  async function move(index: number, direction: -1 | 1) {
    if (state.kind !== 'ready') return;
    const target = index + direction;
    if (target < 0 || target >= state.items.length) return;

    const reordered = [...state.items];
    const temp = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = temp;
    setState({ kind: 'ready', items: reordered });

    try {
      await apiFetch(`${basePath}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ categoryIds: reordered.map((item) => item.id) }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not reorder categories.', 'danger');
      load();
    }
  }

  async function toggleActive(category: ServiceCategory) {
    try {
      await apiFetch(
        `${basePath}/${category.id}/${category.isActive ? 'deactivate' : 'activate'}`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      showToast(category.isActive ? 'Category deactivated' : 'Category activated');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="flex flex-col gap-4 p-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
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
        <ErrorState title="Couldn't load service categories" description={state.message} />
      </main>
    );
  }

  const { items } = state;

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Service categories</h1>
        <Link href={`/salon/${salonId}/service-categories/new`}>+ New category</Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No service categories yet"
          description="Create your first category to start grouping services."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((category, index) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <Link href={`/salon/${salonId}/service-categories/${category.id}/edit`}>
                  {category.name}
                </Link>
                <Badge tone={category.isActive ? 'success' : 'neutral'}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <IconButton
                  label="Move earlier"
                  icon={<span aria-hidden="true">←</span>}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  label="Move later"
                  icon={<span aria-hidden="true">→</span>}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                />
                <Button variant="secondary" onClick={() => toggleActive(category)}>
                  {category.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
