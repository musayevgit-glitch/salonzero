'use client';

import {
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
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface SettingsData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  genderFocus: 'WOMEN' | 'MEN' | 'UNISEX' | null;
  bookingPolicy: {
    autoConfirm: boolean;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
  } | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: SettingsData };

export default function SalonSettingsPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // Form states
  const [description, setDescription] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [genderFocus, setGenderFocus] = useState<'' | 'WOMEN' | 'MEN' | 'UNISEX'>('');

  const [autoConfirm, setAutoConfirm] = useState(false);
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(60);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(60);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState(24);

  const [saving, setSaving] = useState(false);

  function load() {
    setState({ kind: 'loading' });
    apiFetch<SettingsData>(`/salons/${salonId}/settings`)
      .then((data) => {
        setState({ kind: 'ready', data });
        setDescription(data.description ?? '');
        setAddressLine(data.addressLine ?? '');
        setPhone(data.phone ?? '');
        setEmail(data.email ?? '');
        setGenderFocus(data.genderFocus ?? '');

        if (data.bookingPolicy) {
          setAutoConfirm(data.bookingPolicy.autoConfirm);
          setMinNoticeMinutes(data.bookingPolicy.minNoticeMinutes);
          setMaxAdvanceDays(data.bookingPolicy.maxAdvanceDays);
          setCancellationWindowHours(data.bookingPolicy.cancellationWindowHours);
          setRescheduleWindowHours(data.bookingPolicy.rescheduleWindowHours);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/settings`);
          return;
        }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || saving) return;

    setSaving(true);
    try {
      await apiFetch(`/salons/${salonId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: description || null,
          addressLine: addressLine || null,
          phone: phone || null,
          email: email || null,
          genderFocus: genderFocus || null,
          autoConfirm,
          minNoticeMinutes,
          maxAdvanceDays,
          cancellationWindowHours,
          rescheduleWindowHours,
        }),
      });
      showToast('Salon nizamlamaları uğurla yadda saxlanıldı');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Nəsə xəta baş verdi', 'danger');
    } finally {
      setSaving(false);
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
        <ErrorState title="Ayarları yükləmək mümkün olmadı" description={state.message} />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Salon Nizamlamaları & Qaydaları</h1>
        <p className="text-sm text-text-secondary mt-1">
          Salonun profil məlumatlarını və rezervasiya siyasətini buradan idarə edə bilərsiniz.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">Profil Məlumatları</h2>

          <FormField label="Salon təsviri (Haqqında)" optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Salon haqqında məlumat..."
                rows={4}
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Telefon" optional>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+994 (50) 000-0000"
                />
              )}
            </FormField>

            <FormField label="E-poçt" optional>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="salon@example.com"
                />
              )}
            </FormField>
          </div>

          <FormField label="Ünvan" optional>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Küçə adı, bina nömrəsi və s."
              />
            )}
          </FormField>

          <FormField label="Hədəf Kütləsi" optional>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={genderFocus}
                onChange={(e) => setGenderFocus(e.target.value as typeof genderFocus)}
              >
                <option value="">Seçilməyib</option>
                <option value="WOMEN">Qadınlar (Women)</option>
                <option value="MEN">Kişilər (Men)</option>
                <option value="UNISEX">Hər kəs (Unisex)</option>
              </Select>
            )}
          </FormField>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">Rezervasiya Qaydaları</h2>

          <FormField label="Avtomatik təsdiqlənmə" optional>
            {() => (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="autoConfirm"
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="autoConfirm" className="text-sm text-text-primary">
                  Müştəri tərəfindən edilən rezervasiyaları avtomatik təsdiq et
                </label>
              </div>
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Minimum rezervasiya bildirişi (dəqiqə)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  value={minNoticeMinutes}
                  onChange={(e) => setMinNoticeMinutes(Number(e.target.value))}
                  min={0}
                />
              )}
            </FormField>

            <FormField label="Maksimum qabaqcadan rezervasiya limiti (gün)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  value={maxAdvanceDays}
                  onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                  min={1}
                />
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Ləğvetmə pəncərəsi (saat)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  value={cancellationWindowHours}
                  onChange={(e) => setCancellationWindowHours(Number(e.target.value))}
                  min={0}
                />
              )}
            </FormField>

            <FormField label="Vaxt dəyişmə pəncərəsi (saat)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  value={rescheduleWindowHours}
                  onChange={(e) => setRescheduleWindowHours(Number(e.target.value))}
                  min={0}
                />
              )}
            </FormField>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" loading={saving}>
            Yadda saxla
          </Button>
        </div>
      </form>
    </main>
  );
}
