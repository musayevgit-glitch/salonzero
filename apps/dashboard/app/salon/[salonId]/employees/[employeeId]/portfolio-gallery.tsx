'use client';

import { Alert, Button, ConfirmDialog, IconButton, Input, Skeleton, useToast } from '@salonomia/ui';
import { ALLOWED_PORTFOLIO_MIME_TYPES, MAX_PORTFOLIO_UPLOAD_BYTES } from '@salonomia/validation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError, putFile } from '../../../../../lib/api-client';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

interface UploadTargetResponse {
  url: string;
  objectKey: string;
}

const ALLOWED_TYPES = new Set<string>(ALLOWED_PORTFOLIO_MIME_TYPES);

export function PortfolioGallery({ salonId, employeeId }: { salonId: string; employeeId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const basePath = `/salons/${salonId}/employees/${employeeId}/portfolio`;

  function load() {
    apiFetch<PortfolioItem[]>(basePath)
      .then(setItems)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiError ? err.message : 'Could not load the portfolio.');
      });
  }

  useEffect(load, [basePath]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    if (!ALLOWED_TYPES.has(file.type)) {
      setUploadError('Only JPEG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_PORTFOLIO_UPLOAD_BYTES) {
      setUploadError('That image is too large (5MB max).');
      return;
    }

    setUploading(true);
    try {
      const target = await apiFetch<UploadTargetResponse>(`${basePath}/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }),
      });
      await putFile(target.url, file);
      await apiFetch(basePath, {
        method: 'POST',
        body: JSON.stringify({ objectKey: target.objectKey }),
      });
      showToast('Photo added');
      load();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!items) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const reordered = [...items];
    const temp = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = temp;
    setItems(reordered);

    try {
      await apiFetch(`${basePath}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ itemIds: reordered.map((item) => item.id) }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not reorder photos.', 'danger');
      load();
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`${basePath}/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Photo removed');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not remove photo.', 'danger');
    } finally {
      setDeleting(false);
    }
  }

  async function saveCaption(itemId: string) {
    setSavingCaption(true);
    try {
      await apiFetch(`${basePath}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ caption: captionDraft.trim() || null }),
      });
      setEditingId(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update caption.', 'danger');
    } finally {
      setSavingCaption(false);
    }
  }

  if (loadError) {
    return <Alert tone="danger" title={loadError} />;
  }

  if (!items) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
        <Skeleton className="aspect-square w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {uploadError ? <Alert tone="danger" title={uploadError} /> : null}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_PORTFOLIO_MIME_TYPES.join(',')}
          onChange={handleFileChange}
          className="sr-only"
          id="portfolio-upload-input"
        />
        <label htmlFor="portfolio-upload-input">
          <Button
            type="button"
            variant="secondary"
            loading={uploading}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Add photo
          </Button>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">No photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border p-2"
            >
              <img
                src={item.imageUrl}
                alt={item.caption ?? ''}
                className="aspect-square w-full rounded-[var(--radius-sm)] object-cover"
              />

              {editingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    aria-label="Caption"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      loading={savingCaption}
                      disabled={savingCaption}
                      onClick={() => saveCaption(item.id)}
                    >
                      Save
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="truncate text-left text-sm text-text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  onClick={() => {
                    setEditingId(item.id);
                    setCaptionDraft(item.caption ?? '');
                  }}
                >
                  {item.caption || 'Add caption'}
                </button>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <IconButton
                    label="Move earlier"
                    icon={<span aria-hidden="true">←</span>}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    label="Move later"
                    icon={<span aria-hidden="true">→</span>}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                  />
                </div>
                <IconButton
                  label="Delete photo"
                  icon={<span aria-hidden="true">🗑</span>}
                  onClick={() => setDeleteTarget(item)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this photo?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        confirming={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
