import { apiFetch } from './api-client';

export interface SalonOption {
  id: string;
  name: string;
  city: string | null;
  slug?: string;
  status?: string;
}

// listSalonsQuerySchema caps pageSize at 100, so requesting 200 is a 400, not a bigger page.
const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 20;

/**
 * Loads every salon the superadmin can see, paging through /api/salons until exhausted.
 * Used by the superadmin pickers (service creation, category management, user role assignment).
 */
export async function fetchAllSalons(params?: { status?: string }): Promise<SalonOption[]> {
  const all: SalonOption[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(MAX_PAGE_SIZE),
    });
    if (params?.status) query.set('status', params.status);

    const res = await apiFetch<{ items: SalonOption[]; total: number }>(
      `/salons?${query.toString()}`,
    );
    all.push(...res.items);
    if (all.length >= res.total || res.items.length === 0) break;
  }

  return all.sort((a, b) => a.name.localeCompare(b.name, 'az'));
}
