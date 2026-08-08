'use client';

import { Button, useToast } from '@salonomia/ui';
import { useRef, useState } from 'react';
import { apiFetch, apiFetchFormData, ApiError } from '../../../../../../lib/api-client';

interface Props {
  salonId: string;
  employeeId: string;
  currentPhotoUrl: string | null;
  onUpdate: () => void;
}

export function PhotoUpload({ salonId, employeeId, currentPhotoUrl, onUpdate }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await apiFetchFormData<{ photoUrl: string }>(
        `/salons/${salonId}/employees/${employeeId}/photo`,
        { method: 'POST', body: form },
      );
      setPreviewUrl(result.photoUrl);
      showToast('Photo updated successfully.');
      onUpdate();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Upload failed.', 'danger');
      // Revert preview on failure
      setPreviewUrl(currentPhotoUrl);
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await apiFetch(`/salons/${salonId}/employees/${employeeId}/photo`, { method: 'DELETE' });
      setPreviewUrl(null);
      showToast('Photo removed.');
      onUpdate();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to remove photo.', 'danger');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar circle */}
      <div
        style={{
          width: '5rem',
          height: '5rem',
          borderRadius: '50%',
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Upload profile photo"
        />
        <Button
          variant="secondary"
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? 'Change photo' : 'Upload photo'}
        </Button>
        {previewUrl ? (
          <Button variant="destructive" loading={removing} onClick={handleRemove}>
            Remove
          </Button>
        ) : null}
        <p className="text-xs text-text-secondary">JPEG, PNG or WebP · max 5 MB</p>
      </div>
    </div>
  );
}
