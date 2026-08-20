'use client';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@salonomia/ui';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { fetchAllSalons, type SalonOption } from '../../../../lib/fetch-all-salons';
import { PageHeader } from '../../../_components/admin/PageHeader';

interface ServiceCategory {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Service categories are salon-scoped (ServiceCategory.salonId), so there is no meaningful
 * "global" category list. This page gives the superadmin one place to pick any salon and run
 * the full category workflow — create, rename, activate/deactivate, reorder — reusing the same
 * tenant-scoped `/api/salons/[salonId]/service-categories` endpoints the salon admin uses.
 * Superadmins pass those handlers' authorization via getSalonContext; no privileged bypass exists
 * client-side.
 */
export default function SuperadminServiceCategoriesPage() {
  const { showToast } = useToast();

  const [salons, setSalons] = useState<SalonOption[] | null>(null);
  const [salonsError, setSalonsError] = useState<string | null>(null);
  const [salonId, setSalonId] = useState('');

  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAllSalons()
      .then((items) => {
        setSalons(items);
        setSalonId((current) => current || (items[0]?.id ?? ''));
      })
      .catch((err: unknown) => {
        setSalons([]);
        setSalonsError(err instanceof ApiError ? err.message : 'Salonları yükləmək mümkün olmadı.');
      });
  }, []);

  const loadCategories = useCallback(() => {
    if (!salonId) return;
    setCategoriesError(null);
    apiFetch<ServiceCategory[]>(`/salons/${salonId}/service-categories`)
      .then(setCategories)
      .catch((err: unknown) => {
        setCategories([]);
        setCategoriesError(
          err instanceof ApiError ? err.message : 'Kateqoriyaları yükləmək mümkün olmadı.',
        );
      });
  }, [salonId]);

  useEffect(() => {
    setCategories(null);
    loadCategories();
  }, [loadCategories]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!salonId || !name) return;
    setCreating(true);
    try {
      await apiFetch(`/salons/${salonId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      showToast('Kateqoriya yaradıldı');
      setNewName('');
      loadCategories();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(category: ServiceCategory) {
    const name = editingName.trim();
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/salons/${salonId}/service-categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      showToast('Kateqoriya yeniləndi');
      setEditingId(null);
      loadCategories();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(category: ServiceCategory) {
    setBusy(true);
    try {
      await apiFetch(
        `/salons/${salonId}/service-categories/${category.id}/${
          category.isActive ? 'deactivate' : 'activate'
        }`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      showToast(category.isActive ? 'Kateqoriya deaktiv edildi' : 'Kateqoriya aktivləşdirildi');
      loadCategories();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    const temp = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = temp;
    setCategories(reordered);

    try {
      await apiFetch(`/salons/${salonId}/service-categories/reorder`, {
        method: 'POST',
        body: JSON.stringify({ categoryIds: reordered.map((c) => c.id) }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Sıralama yadda saxlanılmadı', 'danger');
      loadCategories();
    }
  }

  return (
    <main className="dashboard-page">
      <PageHeader
        title="Kateqoriyalar"
        description="Kateqoriyalar salona məxsusdur. Salon seçin və onun xidmət kateqoriyalarını idarə edin."
      />

      <div className="flex flex-col gap-2 sm:max-w-md">
        <label htmlFor="salon-picker" className="text-sm font-medium text-text-primary">
          Salon
        </label>
        <Select
          id="salon-picker"
          value={salonId}
          onChange={(e) => setSalonId(e.target.value)}
          disabled={salons === null}
        >
          <option value="">{salons === null ? 'Yüklənir…' : 'Salon seçin'}</option>
          {(salons ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.city ? ` — ${s.city}` : ''}
            </option>
          ))}
        </Select>
        {salonsError && (
          <p className="text-sm text-danger" role="alert">
            {salonsError}
          </p>
        )}
      </div>

      {!salonId ? (
        <EmptyState
          title="Salon seçilməyib"
          description="Kateqoriyaları idarə etmək üçün yuxarıdan salon seçin."
        />
      ) : (
        <>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-1 flex-col gap-1" style={{ minWidth: '14rem' }}>
              <label htmlFor="new-category" className="text-sm font-medium text-text-primary">
                Yeni kateqoriya
              </label>
              <Input
                id="new-category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Məsələn: Saç"
                maxLength={100}
              />
            </div>
            <Button type="submit" disabled={creating || !newName.trim()}>
              {creating ? 'Əlavə olunur…' : '+ Əlavə et'}
            </Button>
          </form>

          {categories === null ? (
            <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
          ) : categoriesError ? (
            <ErrorState
              title="Kateqoriyaları yükləmək mümkün olmadı"
              description={categoriesError}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              title="Kateqoriya yoxdur"
              description="Bu salon üçün hələ kateqoriya yaradılmayıb."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {categories.map((category, index) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-4"
                >
                  <div className="flex flex-1 items-center gap-3" style={{ minWidth: '12rem' }}>
                    {editingId === category.id ? (
                      <Input
                        value={editingName}
                        autoFocus
                        maxLength={100}
                        aria-label="Kateqoriya adı"
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRename(category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleRename(category);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left font-medium text-text-primary underline-offset-2 hover:underline"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        {category.name}
                      </button>
                    )}
                    <Badge tone={category.isActive ? 'success' : 'neutral'}>
                      {category.isActive ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Yuxarı daşı"
                      icon={<span aria-hidden="true">↑</span>}
                      disabled={index === 0 || busy}
                      onClick={() => move(index, -1)}
                    />
                    <IconButton
                      label="Aşağı daşı"
                      icon={<span aria-hidden="true">↓</span>}
                      disabled={index === categories.length - 1 || busy}
                      onClick={() => move(index, 1)}
                    />
                    <Button variant="secondary" disabled={busy} onClick={() => toggleActive(category)}>
                      {category.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
