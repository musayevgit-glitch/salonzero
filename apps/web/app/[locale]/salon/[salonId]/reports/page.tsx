'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface SalonReport {
  from: string;
  to: string;
  total: number;
  byStatus: Record<string, number>;
  revenue: Record<string, number>;
  byDay: Record<string, number>;
  topServices: { name: string; count: number }[];
}

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_AGO = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  CANCELLED_BY_CUSTOMER: 'Cancelled (customer)',
  CANCELLED_BY_SALON: 'Cancelled (salon)',
  REJECTED: 'Rejected',
  NO_SHOW: 'No show',
};

export default function SalonReportsPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const [from, setFrom] = useState(THIRTY_AGO);
  const [to, setTo] = useState(TODAY);
  const [report, setReport] = useState<SalonReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    apiFetch<SalonReport>(`/salons/${salonId}/reports?from=${from}&to=${to}`)
      .then((r) => {
        setReport(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load report.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>

      {/* Date range filter */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <input
            id="from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <input
            id="to"
            type="date"
            value={to}
            min={from}
            max={TODAY}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading && !report && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total reservations" value={String(report.total)} />
            {Object.entries(report.revenue).map(([currency, amount]) => (
              <KpiCard
                key={currency}
                label={`Revenue (${currency})`}
                value={formatMoney(amount, currency)}
              />
            ))}
            <KpiCard label="Completed" value={String(report.byStatus['COMPLETED'] ?? 0)} />
            <KpiCard
              label="Cancellations"
              value={String(
                (report.byStatus['CANCELLED_BY_CUSTOMER'] ?? 0) +
                  (report.byStatus['CANCELLED_BY_SALON'] ?? 0),
              )}
            />
          </div>

          {/* Status breakdown */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Reservations by status</h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(report.byStatus).map(([status, count]) => (
                <div key={status} className="flex flex-col">
                  <dt className="text-xs text-muted-foreground">
                    {STATUS_LABEL[status] ?? status}
                  </dt>
                  <dd className="text-lg font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Top services */}
          {report.topServices.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Top services</h2>
              <ol className="space-y-2">
                {report.topServices.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      {s.name}
                    </span>
                    <span className="font-medium">{s.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Daily breakdown */}
          {Object.keys(report.byDay).length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Daily reservations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 text-left font-medium text-muted-foreground">Date</th>
                      <th className="py-1 text-right font-medium text-muted-foreground">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.byDay).map(([day, count]) => (
                      <tr key={day} className="border-b last:border-0">
                        <td className="py-1">{day}</td>
                        <td className="py-1 text-right font-medium">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
