'use client';

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Textarea,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface BookingOptions {
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    currency: string;
  }[];
  employees: { id: string; fullName: string }[];
}

export default function NewManualReservationPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();

  const [options, setOptions] = useState<BookingOptions | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<BookingOptions>(`/salons/${salonId}/reservations/booking-options`)
      .then(setOptions)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load services.'),
      );
  }, [salonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-submit protection
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        customerEmail,
        customerFullName,
        serviceId,
        startAt: new Date(startAt).toISOString(),
      };
      if (employeeId) body.employeeId = employeeId;
      if (customerNote) body.customerNote = customerNote;
      const created = await apiFetch<{ id: string }>(`/salons/${salonId}/reservations/manual`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/salon/${salonId}/reservations/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: 'Reservations', href: `/salon/${salonId}/reservations` },
          { label: 'New' },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">New reservation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Book on a customer's behalf. If they don't have an account yet, one is created for them.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label="Customer email">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Customer full name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={customerFullName}
                onChange={(e) => setCustomerFullName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Service">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Choose a service…</option>
                {options?.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="Stylist" optional description="Leave blank for any available stylist.">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Any available stylist</option>
                {options?.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="Start time">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Note" optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Create reservation
          </Button>
        </form>
      </Card>
    </main>
  );
}
