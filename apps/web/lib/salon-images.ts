/**
 * Single source of truth for salon imagery on every public surface.
 *
 * There is exactly one fallback. Earlier code picked a cover from a rotating array keyed by the
 * card's list index, so the same salon showed a different photo depending on where it appeared
 * (home page vs. listing vs. page 2 of the listing) and the detail page showed a third image
 * again. Card and detail page now resolve covers identically.
 */

/** The one deterministic placeholder used whenever a salon has no cover of its own. */
export const SALON_COVER_PLACEHOLDER = '/images/salon-cover-placeholder.svg';

function normalize(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Returns the salon's own cover, or the single shared placeholder. Never random. */
export function resolveSalonCoverUrl(coverUrl: string | null | undefined): string {
  return normalize(coverUrl) ?? SALON_COVER_PLACEHOLDER;
}

/**
 * Returns the salon's logo, or null. There is no logo placeholder image — callers fall back to
 * rendering the salon's initials, which is meaningful where a generic glyph would not be.
 */
export function resolveSalonLogoUrl(logoUrl: string | null | undefined): string | null {
  return normalize(logoUrl);
}
