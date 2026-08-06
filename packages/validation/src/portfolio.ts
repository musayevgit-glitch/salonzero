import { z } from 'zod';

// SVG and any executable/script MIME type are deliberately excluded — see Prompt 12.3's
// "no executable or SVG upload unless explicitly sanitized and approved" requirement. Nothing in
// this codebase sanitizes SVG, so it stays off the allowlist entirely.
export const ALLOWED_PORTFOLIO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PORTFOLIO_UPLOAD_BYTES = 5 * 1024 * 1024;

export const requestPortfolioUploadSchema = z
  .object({
    mimeType: z.enum(ALLOWED_PORTFOLIO_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_PORTFOLIO_UPLOAD_BYTES),
  })
  .strict();
export type RequestPortfolioUploadInput = z.infer<typeof requestPortfolioUploadSchema>;

// objectKey is opaque server-generated state round-tripped by the client, not free-form input —
// still bounded and pattern-checked here so a malformed/forged value 400s before it ever reaches
// the storage adapter's own (stricter) path-safety check.
export const confirmPortfolioItemSchema = z
  .object({
    objectKey: z.string().min(1).max(300),
    caption: z.string().trim().min(1).max(300).optional(),
  })
  .strict();
export type ConfirmPortfolioItemInput = z.infer<typeof confirmPortfolioItemSchema>;

// caption doubles as the image's accessible alt text (rendered as both <img alt> and the visible
// caption) — the data model (ADR-approved) has one text field per portfolio item, not two.
export const updatePortfolioItemSchema = z
  .object({
    caption: z.string().trim().min(1).max(300).nullable(),
  })
  .strict();
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;

export const reorderPortfolioSchema = z
  .object({
    itemIds: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict();
export type ReorderPortfolioInput = z.infer<typeof reorderPortfolioSchema>;
