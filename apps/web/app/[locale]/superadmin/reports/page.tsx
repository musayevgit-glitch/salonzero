'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import Link from 'next/link';

interface GlobalReport {
  from: string;
  to: string;
  total: number;
  byStatus: Record<string, number>;
  bySalon: {
    salon: { id: string; name: string; slug: string };
    currency: string;
    confirmedCount: number;
    confirmedRevenue: number;
  }[];
}

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_AGO = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

export default function SuperadminReportsPage() {
  const [from, setFrom] = useState(THIRTY_AGO);
  const [to, setTo] = useState(TODAY);
  const [report, setReport] = useState<GlobalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    apiFetch<GlobalReport>(`/superadmin/reports?from=${from}&to=${to}`)
      .then((r) => {
        setReport(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load.');
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Platform reports</h1>

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

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total reservations</p>
              <p className="mt-1 text-2xl font-bold">{report.total}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-bold">{report.byStatus['COMPLETED'] ?? 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Active salons</p>
              <p className="mt-1 text-2xl font-bold">
                {new Set(report.bySalon.map((s) => s.salon.id)).size}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Revenue by salon</h2>
            {report.bySalon.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue data in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="py-1 text-left font-medium text-muted-foreground">Salon</th>
                      <th className="py-1 text-right font-medium text-muted-foreground">
                        Bookings
                      </th>
                      <th className="py-1 text-right font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bySalon.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1">
                          <Link
                            href={`/superadmin/salons/${row.salon.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.salon.name}
                          </Link>
                        </td>
                        <td className="py-1 text-right">{row.confirmedCount}</td>
                        <td className="py-1 text-right font-medium">
                          {formatMoney(row.confirmedRevenue, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
