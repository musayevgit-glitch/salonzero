'use client';

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  IconButton,
  Input,
  Link,
  PermissionDeniedState,
  Skeleton,
  Tabs,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiFetchFormData, ApiError } from '../../../../../lib/api-client';
import { PhotoUploadWidget } from '../../_components/PhotoUploadWidget';

// ── Types ─────────────────────────────────────────────────────────────────
interface StylistDetail {
  id: string; fullName: string; bio: string | null; photoUrl: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
  salon: { id: string; name: string; timezone: string; status: string };
  services: { id: string; name: string; isActive: boolean; priceAmount: number; currency: string }[];
  workingSchedules: { id: string; weekday: number; startMinuteOfDay: number; endMinuteOfDay: number }[];
  portfolio: { id: string; imageUrl: string; caption: string | null; sortOrder: number }[];
  reservationCount: number;
}

const DAYS_AZ = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];
function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}

// ── Profile Tab ──────────────────────────────────────────────────────────
function ProfileTab({ stylist, onReload }: { stylist: StylistDetail; onReload: () => void }) {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await apiFetch(`/superadmin/stylists/${stylist.id}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !stylist.isActive }),
      });
      showToast(stylist.isActive ? 'Stilist deaktiv edildi' : 'Stilist aktivləşdirildi');
      setConfirmOpen(false);
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Photo */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Profil şəkli</h3>
        <PhotoUploadWidget
          label="Profil şəkli"
          currentUrl={stylist.photoUrl}
          uploadPath={`/superadmin/stylists/${stylist.id}/photo`}
          rounded
          onUpdated={onReload}
          onRemoved={onReload}
        />
      </Card>

      {/* Info + Schedule */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Məlumatlar</h3>
            <div className="flex gap-3 items-center">
              <Badge tone={stylist.isActive ? 'success' : 'neutral'}>{stylist.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>
              <Link href={`/superadmin/stylists/${stylist.id}/edit`} className="text-sm">Redaktə et</Link>
              <Button variant={stylist.isActive ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)}>
                {stylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
              </Button>
            </div>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {([
              ['Salon', <Link key="s" href={`/superadmin/salons/${stylist.salon.id}`}>{stylist.salon.name}</Link>],
              ['Rezervasiya sayı', stylist.reservationCount],
              ['Əlavə edilib', new Date(stylist.createdAt).toLocaleDateString('az-AZ')],
              ['Son yenilənmə', new Date(stylist.updatedAt).toLocaleDateString('az-AZ')],
            ] as [string, React.ReactNode][]).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-surface px-3 py-2">
                <dt className="shrink-0 text-text-secondary">{label}</dt>
                <dd className="text-right font-medium text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>

          {stylist.bio && (
            <p className="mt-4 text-sm text-text-secondary border-t border-border pt-4">{stylist.bio}</p>
          )}
        </Card>

        {stylist.workingSchedules.length > 0 && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">İş cədvəli</h3>
            <div className="flex flex-col gap-1.5">
              {stylist.workingSchedules.map((ws) => (
                <div key={ws.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-sm">
                  <span className="text-text-secondary">{DAYS_AZ[ws.weekday] ?? ws.weekday}</span>
                  <span className="font-medium text-text-primary">{minToTime(ws.startMinuteOfDay)} – {minToTime(ws.endMinuteOfDay)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen} onOpenChange={setConfirmOpen}
        title={stylist.isActive ? 'Stilisti deaktiv etmək istəyirsiniz?' : 'Stilisti aktivləşdirmək istəyirsiniz?'}
        description={stylist.isActive ? 'Yeni rezervasiyalar üçün əlçatmaz olacaq.' : 'Yenidən rezervasiya qəbul edəcək.'}
        confirmLabel={stylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
        destructive={stylist.isActive} confirming={busy} onConfirm={toggleActive}
      />
    </div>
  );
}

// ── Portfolio Tab ────────────────────────────────────────────────────────
function PortfolioTab({ stylist, onReload }: { stylist: StylistDetail; onReload: () => void }) {
  const { showToast } = useToast();
  const [items, setItems] = useState(stylist.portfolio);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const basePath = `/superadmin/stylists/${stylist.id}/portfolio`;

  // Sync when parent reloads
  useEffect(() => { setItems(stylist.portfolio); }, [stylist.portfolio]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Yalnız JPEG, PNG, WEBP şəkillər qəbul edilir.', 'danger'); return;
    }
    if (file.size > 5 * 1024 * 1024) { showToast('Şəkil 5MB-dan böyük ola bilməz.', 'danger'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await apiFetchFormData(basePath, { method: 'POST', body: form });
      showToast('Şəkil əlavə edildi');
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Yükləmə uğursuz oldu.', 'danger');
    } finally {
      setUploading(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setItems(reordered);
    try {
      await apiFetch(basePath, { method: 'PATCH', body: JSON.stringify({ itemIds: reordered.map((i) => i.id) }) });
    } catch { onReload(); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${basePath}/${deleteTarget}`, { method: 'DELETE' });
      showToast('Şəkil silindi');
      setDeleteTarget(null);
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Silinmə uğursuz oldu.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  async function saveCaption(itemId: string) {
    setSavingCaption(true);
    try {
      await apiFetch(`${basePath}/${itemId}`, {
        method: 'PATCH', body: JSON.stringify({ caption: captionDraft.trim() || null }),
      });
      setEditingId(null);
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta', 'danger');
    } finally {
      setSavingCaption(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{items.length} şəkil</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="sr-only" />
        <Button type="button" variant="secondary" loading={uploading} disabled={uploading} onClick={() => fileRef.current?.click()}>
          + Şəkil əlavə et
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border p-12 text-center text-sm text-text-secondary">
          Portfolio boşdur. Şəkil əlavə edin.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border p-2">
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-sm)]">
                <img src={item.imageUrl} alt={item.caption ?? ''} className="h-full w-full object-cover" />
              </div>
              {editingId === item.id ? (
                <div className="flex flex-col gap-1.5">
                  <Input value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} aria-label="Başlıq" />
                  <div className="flex gap-1.5">
                    <Button type="button" loading={savingCaption} disabled={savingCaption} onClick={() => saveCaption(item.id)}>Saxla</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Ləğv et</Button>
                  </div>
                </div>
              ) : (
                <button type="button" className="truncate text-left text-xs text-text-secondary hover:underline"
                  onClick={() => { setEditingId(item.id); setCaptionDraft(item.caption ?? ''); }}>
                  {item.caption || 'Başlıq əlavə et'}
                </button>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <IconButton label="Sola" icon={<span aria-hidden>←</span>} disabled={index === 0} onClick={() => move(index, -1)} />
                  <IconButton label="Sağa" icon={<span aria-hidden>→</span>} disabled={index === items.length - 1} onClick={() => move(index, 1)} />
                </div>
                <IconButton label="Sil" icon={<span aria-hidden>🗑</span>} onClick={() => setDeleteTarget(item.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}
        title="Bu şəkli silmək istəyirsiniz?" description="Bu əməliyyat geri qaytarıla bilməz."
        confirmLabel="Sil" destructive confirming={deleting} onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Services Tab ─────────────────────────────────────────────────────────
interface SalonService { id: string; name: string; isActive: boolean; }
interface SalonServiceList { items: SalonService[]; }
interface AssignedService { id: string; name: string; }

function ServicesTab({ stylist, onReload }: { stylist: StylistDetail; onReload: () => void }) {
  const { showToast } = useToast();
  const [assigned, setAssigned] = useState<AssignedService[]>([]);
  const [allServices, setAllServices] = useState<SalonService[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<AssignedService | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const salonId = stylist.salon.id;
  const employeeId = stylist.id;
  const basePath = `/salons/${salonId}/employees/${employeeId}/services`;

  function loadAssigned() {
    apiFetch<AssignedService[]>(basePath)
      .then(setAssigned)
      .catch(() => setAssigned([]));
  }

  useEffect(() => {
    loadAssigned();
    apiFetch<SalonServiceList>(`/salons/${salonId}/services?isActive=true&pageSize=100`)
      .then((r) => setAllServices(r.items))
      .catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, employeeId]);

  const assignedIds = new Set(assigned.map((s) => s.id));
  const available = allServices.filter((s) => !assignedIds.has(s.id));

  async function handleAssign() {
    if (!selectedId) return;
    setAssigning(true);
    try {
      await apiFetch(basePath, { method: 'POST', body: JSON.stringify({ serviceId: selectedId }) });
      showToast('Xidmət təyin edildi');
      setSelectedId('');
      loadAssigned();
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi.', 'danger');
    } finally { setAssigning(false); }
  }

  async function handleUnassign() {
    if (!unassignTarget) return;
    setUnassigning(true);
    try {
      await apiFetch(`${basePath}/${unassignTarget.id}`, { method: 'DELETE' });
      showToast('Xidmət silindi');
      setUnassignTarget(null);
      loadAssigned();
      onReload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi.', 'danger');
    } finally { setUnassigning(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Assign row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Xidmət seç"
          className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring sm:max-w-xs"
        >
          <option value="">Xidmət seç…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button type="button" onClick={handleAssign} loading={assigning} disabled={assigning || !selectedId}>
          Təyin et
        </Button>
      </div>

      {/* Assigned list */}
      {assigned.length === 0 ? (
        <p className="py-4 text-sm text-text-secondary">Bu stilistə xidmət təyin edilməyib.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assigned.map((svc) => (
            <li key={svc.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-4 py-3">
              <span className="text-sm font-medium text-text-primary">{svc.name}</span>
              <IconButton label={`Sil: ${svc.name}`} icon={<span aria-hidden="true">✕</span>} onClick={() => setUnassignTarget(svc)} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={unassignTarget !== null}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`"${unassignTarget?.name ?? ''}" xidmətini silmək istəyirsiniz?`}
        description="Stilist bu xidmət üzrə rezervasiya qəbul edə bilməyəcək."
        confirmLabel="Sil"
        destructive
        confirming={unassigning}
        onConfirm={handleUnassign}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
type PageState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; stylist: StylistDetail };

export default function SuperadminStylistDetailPage() {
  const router = useRouter();
  const { stylistId } = useParams<{ stylistId: string }>();
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const load = useCallback(() => {
    apiFetch<StylistDetail>(`/superadmin/stylists/${stylistId}`)
      .then((stylist) => setState({ kind: 'ready', stylist }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) { router.replace('/login'); return; }
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'not-found' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }, [stylistId, router]);

  useEffect(() => { load(); }, [load]);

  if (state.kind === 'loading') return <main className="p-8"><Skeleton className="h-12 w-64 mb-6" /><Skeleton className="h-96 w-full" /></main>;
  if (state.kind === 'not-found') return <main className="p-8"><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main className="p-8"><ErrorState title="Stilist yüklənmədi" description={state.message} /></main>;

  const { stylist } = state;

  return (
    <main className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <Breadcrumbs items={[
          { label: 'Stilistlər', href: '/superadmin/stylists' },
          { label: stylist.salon.name, href: `/superadmin/salons/${stylist.salon.id}` },
          { label: stylist.fullName },
        ]} />
        <div className="mt-3 flex items-center gap-4">
          {stylist.photoUrl
            ? <img src={stylist.photoUrl} alt={stylist.fullName} className="h-14 w-14 rounded-full object-cover border border-border" />
            : (
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface border border-border text-xl font-bold text-text-secondary">
                {stylist.fullName.slice(0, 1)}
              </span>
            )
          }
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{stylist.fullName}</h1>
            <p className="text-sm text-text-secondary">
              <Link href={`/superadmin/salons/${stylist.salon.id}`}>{stylist.salon.name}</Link>
              {' · '}
              <Badge tone={stylist.isActive ? 'success' : 'neutral'}>{stylist.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>
            </p>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'profile', label: 'Profil', content: <ProfileTab stylist={stylist} onReload={load} /> },
          { value: 'portfolio', label: `Portfolio (${stylist.portfolio.length})`, content: <PortfolioTab stylist={stylist} onReload={load} /> },
          { value: 'services', label: `Xidmətlər (${stylist.services.length})`, content: <ServicesTab stylist={stylist} onReload={load} /> },
        ]}
      />
    </main>
  );
}
