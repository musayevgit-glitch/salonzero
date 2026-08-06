import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { fetchApiServer, ApiServerError } from '../../../lib/fetch-api-server';

export const dynamic = 'force-dynamic';

interface ReservationListItem {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  service: { name: string; durationMinutes: number };
  employee: { fullName: string } | null;
  salon: { name: string; slug: string };
}

interface ReservationList {
  items: ReservationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED_BY_CUSTOMER: 'Cancelled',
  CANCELLED_BY_SALON: 'Cancelled by salon',
  REJECTED: 'Rejected',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  NO_SHOW: 'No show',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  CANCELLED_BY_CUSTOMER: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  CANCELLED_BY_SALON: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CHECKED_IN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  COMPLETED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  NO_SHOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
};

export default async function ReservationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  let data: ReservationList;
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    data = await fetchApiServer<ReservationList>(`/customer/reservations?${params}`, {
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 401) {
      redirect('/login?returnTo=/account/reservations');
    }
    if (err instanceof ApiServerError && err.status === 403) {
      redirect('/login?returnTo=/account/reservations');
    }
    notFound();
  }

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary">My reservations</h1>

      {data.items.length === 0 ? (
        <div className="mt-8 text-center text-sm text-text-secondary">
          <p>No reservations yet.</p>
          <Link href="/salons" className="mt-2 inline-block text-accent underline">
            Discover salons
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {data.items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/account/reservations/${r.id}`}
                className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-4 no-underline transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{r.service.name}</span>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_COLOR[r.status] ?? '',
                    ].join(' ')}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <span className="text-sm text-text-secondary">{r.salon.name}</span>
                <span className="text-sm text-text-secondary">
                  {new Intl.DateTimeFormat(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(r.startAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`?page=${page - 1}`} className="text-accent underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-secondary">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`?page=${page + 1}`} className="text-accent underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
