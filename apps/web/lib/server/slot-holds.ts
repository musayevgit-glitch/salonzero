/**
 * Slot holds are short-lived reservations-in-progress: picking a time on the date/time step takes
 * a hold so nobody else can grab that slot while the customer finishes checking out.
 *
 * The subtle part is who a hold blocks. A hold must block *other* customers, but never the person
 * who placed it. Before holds recorded an owner, the reservation endpoint re-checked availability
 * at submit time, saw the customer's own hold sitting on the chosen slot, and concluded the slot
 * was taken — so every booking that reached the confirm step failed with a 409 and no reservation
 * could be created at all.
 *
 * This module is the single definition of that rule, shared by the reservation endpoint and both
 * availability endpoints so the three cannot drift apart.
 */

/** The subset of a Prisma `SlotHoldWhereInput` that expresses "held by someone else". */
export interface BlockingHoldFilter {
  expiresAt: { gt: Date };
  NOT?: { heldByUserId: string };
}

/**
 * Builds the filter selecting holds that should block `viewerId`.
 *
 * @param now      Instant used to discard already-expired holds.
 * @param viewerId The user the availability is being computed for, or null for an anonymous
 *                 visitor (who owns no holds, and is therefore blocked by all of them).
 */
export function blockingHoldFilter(now: Date, viewerId: string | null): BlockingHoldFilter {
  return {
    expiresAt: { gt: now },
    ...(viewerId ? { NOT: { heldByUserId: viewerId } } : {}),
  };
}

/**
 * In-memory counterpart of {@link blockingHoldFilter}, for reasoning about holds already loaded.
 * Kept beside it so the two encode exactly one rule.
 */
export function isHoldBlocking(
  hold: { expiresAt: Date; heldByUserId: string | null },
  now: Date,
  viewerId: string | null,
): boolean {
  if (hold.expiresAt.getTime() <= now.getTime()) return false;
  if (viewerId !== null && hold.heldByUserId === viewerId) return false;
  return true;
}
