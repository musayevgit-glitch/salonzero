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
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface SalonDetail {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  city: string | null;
  description: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  genderFocus: 'WOMEN' | 'MEN' | 'UNISEX' | null;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; salon: SalonDetail };

export default function EditSalonPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [genderFocus, setGenderFocus] = useState<'WOMEN' | 'MEN' | 'UNISEX' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<SalonDetail>(`/salons/${salonId}`)
      .then((salon) => {
        setState({ kind: 'ready', salon });
        setName(salon.name);
        setTimezone(salon.timezone);
        setCity(salon.city ?? '');
        setDescription(salon.description ?? '');
        setAddressLine(salon.addressLine ?? '');
        setPhone(salon.phone ?? '');
        setEmail(salon.email ?? '');
        setGenderFocus(salon.genderFocus ?? '');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/superadmin/salons/${salonId}/edit`);
          return;
        }
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }, [salonId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          timezone: timezone.trim(),
          city: city.trim() || null,
          description: description.trim() || null,
          addressLine: addressLine.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          genderFocus: genderFocus || null,
          expectedUpdatedAt: state.salon.updatedAt,
        }),
      });
      showToast('Salon yeniləndi');
      router.push(`/superadmin/salons/${salonId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Salon başqa biri tərəfindən dəyişdirildi. Səhifəni yeniləyib yenidən cəhd edin.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Xəta baş verdi. Yenidən cəhd edin.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') return (
    <main className="p-8"><Skeleton className="h-96 w-full max-w-2xl" /></main>
  );
  if (state.kind === 'permission-denied') return (
    <main className="p-8"><PermissionDeniedState /></main>
  );
  if (state.kind === 'error') return (
    <main className="p-8"><ErrorState title="Salon yüklənmədi" description={state.message} /></main>
  );

  return (
    <main className="flex flex-col gap-6 p-6 lg:p-8">
      <Breadcrumbs
        items={[
          { label: 'Salonlar', href: '/superadmin/salons' },
          { label: state.salon.name, href: `/superadmin/salons/${salonId}` },
          { label: 'Redaktə' },
        ]}
      />

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Salonu redaktə et</h1>
        <p className="text-sm text-text-secondary">Slug: <code className="bg-surface px-1.5 py-0.5 rounded text-xs">{state.salon.slug}</code></p>
      </div>

      <Card className="max-w-2xl">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {error && <Alert tone="danger" title={error} />}

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Salon adı" className="sm:col-span-2">
              {(p) => (
                <Input {...p} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Məs. Nova Beauty Studio" />
              )}
            </FormField>

            <FormField label="Saat qurşağı" description="IANA format, məs. Asia/Baku">
              {(p) => (
                <Input {...p} required value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Baku" />
              )}
            </FormField>

            <FormField label="Şəhər" optional>
              {(p) => (
                <Input {...p} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bakı" />
              )}
            </FormField>

            <FormField label="Ünvan" optional className="sm:col-span-2">
              {(p) => (
                <Input {...p} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Neftçilər pr. 12, Bakı" />
              )}
            </FormField>

            <FormField label="Telefon" optional>
              {(p) => (
                <Input {...p} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994 50 000 00 00" />
              )}
            </FormField>

            <FormField label="E-poçt" optional>
              {(p) => (
                <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@salon.az" />
              )}
            </FormField>

            <FormField label="Hədəf auditoriya" optional>
              {(p) => (
                <Select {...p} value={genderFocus} onChange={(e) => setGenderFocus(e.target.value as typeof genderFocus)}>
                  <option value="">Seçilməyib</option>
                  <option value="WOMEN">Qadınlar</option>
                  <option value="MEN">Kişilər</option>
                  <option value="UNISEX">Hamı üçün</option>
                </Select>
              )}
            </FormField>

            <FormField label="Açıqlama" optional className="sm:col-span-2">
              {(p) => (
                <Textarea {...p} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Salon haqqında qısa məlumat..." />
              )}
            </FormField>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={submitting} disabled={submitting}>
              Dəyişiklikləri saxla
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/superadmin/salons/${salonId}`)}>
              Ləğv et
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
