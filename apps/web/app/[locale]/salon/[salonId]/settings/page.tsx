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
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { PageHeader } from '../../../../_components/admin/PageHeader';

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
    bookingSlotIntervalMinutes: number;
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
  const t = useTranslations('salonAdmin');
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
  const [bookingSlotIntervalMinutes, setBookingSlotIntervalMinutes] = useState(15);
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
          setBookingSlotIntervalMinutes(data.bookingPolicy.bookingSlotIntervalMinutes ?? 15);
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
          bookingSlotIntervalMinutes,
          cancellationWindowHours,
          rescheduleWindowHours,
        }),
      });
      showToast(t('settings.saveSuccess'));
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Something went wrong.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="dashboard-page">
        <ErrorState title={t('settings.errorLoad')} description={state.message} />
      </main>
    );
  }

  return (
    <main className="dashboard-page max-w-3xl">
      <PageHeader title={t('settings.pageTitle')} description={t('settings.subtitle')} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">{t('settings.profileInfo')}</h2>

          <FormField label={t('settings.descriptionLabel')} optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('settings.descriptionPlaceholder')}
                rows={4}
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('settings.phoneLabel')} optional>
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

            <FormField label={t('settings.emailLabel')} optional>
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

          <FormField label={t('settings.addressLabel')} optional>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
            )}
          </FormField>

          <FormField label={t('settings.genderFocus')} optional>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={genderFocus}
                onChange={(e) => setGenderFocus(e.target.value as typeof genderFocus)}
              >
                <option value="">{t('settings.genderNotSet')}</option>
                <option value="WOMEN">{t('settings.genderWomen')}</option>
                <option value="MEN">{t('settings.genderMen')}</option>
                <option value="UNISEX">{t('settings.genderUnisex')}</option>
              </Select>
            )}
          </FormField>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold text-text-primary">{t('settings.bookingPolicy')}</h2>

          <FormField label={t('settings.autoConfirm')} optional>
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
                  {t('settings.autoConfirmDesc')}
                </label>
              </div>
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('settings.minNoticeMinutes')}>
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

            <FormField label={t('settings.maxAdvanceDays')}>
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
            <FormField
              label={t('settings.bookingSlotInterval')}
              description={t('settings.bookingSlotIntervalHint')}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={String(bookingSlotIntervalMinutes)}
                  onChange={(e) => setBookingSlotIntervalMinutes(Number(e.target.value))}
                >
                  {[5, 10, 15, 20, 30].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} {t('settings.minutesShort')}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('settings.cancellationWindow')}>
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

            <FormField label={t('settings.rescheduleWindow')}>
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
            {t('common.save')}
          </Button>
        </div>
      </form>
    </main>
  );
}
