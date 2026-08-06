import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Link,
  PublicShell,
  Select,
} from '@salonomia/ui';
import type { Metadata } from 'next';
import { getIsAuthenticated } from '../lib/fetch-api-server';
import { fetchPublicApi, PublicApiError } from '../lib/public-api';

export const metadata: Metadata = {
  title: 'Salonomia — Discover Salons',
  description: 'Find and book appointments at salons near you.',
};

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
  startingPrice: { amount: number; currency: string } | null;
}

interface SalonListResponse {
  items: SalonListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const GENDER_FOCUS_LABEL: Record<string, string> = {
  WOMEN: 'Women',
  MEN: 'Men',
  UNISEX: 'Unisex',
};

function formatStartingPrice(price: SalonListItem['startingPrice']): string | null {
  if (!price) return null;
  return `From ${new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency }).format(price.amount / 100)}`;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = firstValue(sp.search);
  const city = firstValue(sp.city);
  const genderFocus = firstValue(sp.genderFocus);
  const minPrice = firstValue(sp.minPrice);
  const maxPrice = firstValue(sp.maxPrice);
  const sort = firstValue(sp.sort) || 'name_asc';
  const page = firstValue(sp.page) || '1';

  const query = new URLSearchParams({ page, sort });
  if (search) query.set('search', search);
  if (city) query.set('city', city);
  if (genderFocus) query.set('genderFocus', genderFocus);
  if (minPrice) query.set('minPrice', minPrice);
  if (maxPrice) query.set('maxPrice', maxPrice);

  const [isAuthenticated, fetchResult] = await Promise.all([
    getIsAuthenticated(),
    fetchPublicApi<SalonListResponse>(`/public/salons?${query.toString()}`).catch((err) => err),
  ]);

  let data: SalonListResponse | null = null;
  let errorMessage: string | null = null;
  if (fetchResult instanceof Error) {
    errorMessage =
      fetchResult instanceof PublicApiError ? fetchResult.message : 'Something went wrong.';
  } else {
    data = fetchResult;
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const currentPage = data?.page ?? 1;

  function pageHref(targetPage: number): string {
    const p = new URLSearchParams(query);
    p.set('page', String(targetPage));
    return `/?${p.toString()}`;
  }

  return (
    <PublicShell isAuthenticated={isAuthenticated}>
      <div className="flex flex-col gap-8">
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5 shadow-[var(--shadow-sm)] sm:p-8">
          <p className="text-sm font-medium text-accent">Book calmer. Look sharper.</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl">
            Discover salons
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
            Browse salons, compare services, and book your next appointment.
          </p>
        </section>

        <form
          method="get"
          className="grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-4 shadow-[var(--shadow-sm)] sm:grid-cols-2 sm:p-5 lg:grid-cols-6"
        >
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="search" className="mb-1.5 block text-sm font-medium text-text-primary">
              Search
            </label>
            <Input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="Salon name or city"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-text-primary">
              City
            </label>
            <Input id="city" name="city" defaultValue={city} placeholder="Any city" />
          </div>
          <div>
            <label
              htmlFor="genderFocus"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Focus
            </label>
            <Select id="genderFocus" name="genderFocus" defaultValue={genderFocus}>
              <option value="">Any</option>
              <option value="WOMEN">Women</option>
              <option value="MEN">Men</option>
              <option value="UNISEX">Unisex</option>
            </Select>
          </div>
          <div>
            <label
              htmlFor="minPrice"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Min price
            </label>
            <Input id="minPrice" type="number" name="minPrice" defaultValue={minPrice} min={0} />
          </div>
          <div>
            <label
              htmlFor="maxPrice"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Max price
            </label>
            <Input id="maxPrice" type="number" name="maxPrice" defaultValue={maxPrice} min={0} />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-6">
            <div className="sm:w-48">
              <label htmlFor="sort" className="mb-1.5 block text-sm font-medium text-text-primary">
                Sort by
              </label>
              <Select id="sort" name="sort" defaultValue={sort}>
                <option value="name_asc">Name (A–Z)</option>
                <option value="name_desc">Name (Z–A)</option>
                <option value="newest">Newest</option>
              </Select>
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:opacity-80 sm:w-auto"
            >
              Apply filters
            </button>
          </div>
        </form>

        {errorMessage ? (
          <ErrorState title="Couldn't load salons" description={errorMessage} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            title="No salons match your filters"
            description="Try a broader search or different filters."
          />
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((salon) => (
                <Link key={salon.id} href={`/salons/${salon.slug}`} className="no-underline">
                  <Card className="group h-full transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <h2 className="min-w-0 break-words text-lg font-semibold text-text-primary">
                        {salon.name}
                      </h2>
                      {salon.genderFocus ? (
                        <span className="shrink-0">
                          <Badge>
                            {GENDER_FOCUS_LABEL[salon.genderFocus] ?? salon.genderFocus}
                          </Badge>
                        </span>
                      ) : null}
                    </div>
                    {salon.city ? (
                      <p className="mt-1 text-sm text-text-secondary">{salon.city}</p>
                    ) : null}
                    {salon.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                        {salon.description}
                      </p>
                    ) : null}
                    {salon.startingPrice ? (
                      <p className="mt-3 text-sm font-medium text-text-primary">
                        {formatStartingPrice(salon.startingPrice)}
                      </p>
                    ) : null}
                    <p className="mt-4 text-sm font-medium text-accent group-hover:underline">
                      View salon →
                    </p>
                  </Card>
                </Link>
              ))}
            </div>

            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
                {currentPage > 1 ? (
                  <Link href={pageHref(currentPage - 1)}>Previous</Link>
                ) : (
                  <span aria-hidden="true" />
                )}
                <p className="text-sm text-text-secondary">
                  Page {currentPage} of {pageCount}
                </p>
                {currentPage < pageCount ? (
                  <Link href={pageHref(currentPage + 1)}>Next</Link>
                ) : (
                  <span aria-hidden="true" />
                )}
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </PublicShell>
  );
}
