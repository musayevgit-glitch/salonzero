'use client';

import { Button, useToast } from '@salonomia/ui';
import { useRef, useState } from 'react';
import { apiFetchFormData, ApiError } from '../../../../lib/api-client';

interface Props {
  label: string;
  currentUrl: string | null;
  uploadPath: string; // POST multipart/form-data with 'file' field
  aspectRatio?: string;
  rounded?: boolean;
  onUpdated?: (url: string) => void;
  onRemoved?: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploadWidget({
  label,
  currentUrl,
  uploadPath,
  aspectRatio = '16/7',
  rounded = false,
  onUpdated,
  onRemoved,
}: Props) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Yalnız JPEG, PNG və ya WEBP şəkillər qəbul edilir.', 'danger');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Şəkil 5MB-dan böyük ola bilməz.', 'danger');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiFetchFormData<{
        coverUrl?: string;
        logoUrl?: string;
        photoUrl?: string;
      }>(uploadPath, { method: 'POST', body: form });
      const url = result.coverUrl ?? result.logoUrl ?? result.photoUrl ?? '';
      setPreviewUrl(url);
      onUpdated?.(url);
      showToast(`${label} yeniləndi`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Yükləmə uğursuz oldu.', 'danger');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await apiFetchFormData(uploadPath, { method: 'DELETE' });
      setPreviewUrl(null);
      onRemoved?.();
      showToast(`${label} silindi`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Silinmə uğursuz oldu.', 'danger');
    } finally {
      setRemoving(false);
    }
  }

  const shape = rounded
    ? 'rounded-full w-24 h-24 overflow-hidden'
    : `rounded-[var(--radius-md)] overflow-hidden w-full`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text-primary">{label}</p>

      <div
        className={`${shape} relative border border-border bg-surface flex items-center justify-center`}
        style={rounded ? undefined : { aspectRatio }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-text-secondary">Şəkil yoxdur</span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFile}
        className="sr-only"
        aria-label={`${label} yüklə`}
      />

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="secondary"
          loading={uploading}
          disabled={uploading || removing}
          onClick={() => fileRef.current?.click()}
        >
          {previewUrl ? 'Dəyişdir' : 'Yüklə'}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            loading={removing}
            disabled={uploading || removing}
            onClick={handleRemove}
          >
            Sil
          </Button>
        )}
      </div>
    </div>
  );
}
