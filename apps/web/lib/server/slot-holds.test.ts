import { describe, expect, it } from 'vitest';
import { blockingHoldFilter, isHoldBlocking } from './slot-holds';

const NOW = new Date('2026-08-20T10:00:00.000Z');
const CUSTOMER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function hold(overrides: Partial<{ expiresAt: Date; heldByUserId: string | null }> = {}) {
  return {
    expiresAt: new Date(NOW.getTime() + 5 * 60_000),
    heldByUserId: OTHER,
    ...overrides,
  };
}

describe('blockingHoldFilter', () => {
  it('always discards expired holds', () => {
    expect(blockingHoldFilter(NOW, null).expiresAt).toEqual({ gt: NOW });
    expect(blockingHoldFilter(NOW, CUSTOMER).expiresAt).toEqual({ gt: NOW });
  });

  /**
   * Regression test for the bug that made customer reservations impossible to create.
   *
   * The date/time step takes a hold on the chosen slot. When the confirm step then POSTed the
   * reservation, the server re-checked availability and counted that same hold as a conflict,
   * so every booking returned 409 and no reservation was ever written. The filter must exclude
   * the requesting customer's own holds.
   */
  it("excludes the requesting customer's own holds", () => {
    expect(blockingHoldFilter(NOW, CUSTOMER).NOT).toEqual({ heldByUserId: CUSTOMER });
  });

  it('blocks on every hold for an anonymous viewer, who owns none', () => {
    expect(blockingHoldFilter(NOW, null).NOT).toBeUndefined();
  });
});

describe('isHoldBlocking', () => {
  it("does not block the hold's own owner", () => {
    expect(isHoldBlocking(hold({ heldByUserId: CUSTOMER }), NOW, CUSTOMER)).toBe(false);
  });

  it("blocks another customer's live hold", () => {
    expect(isHoldBlocking(hold(), NOW, CUSTOMER)).toBe(true);
  });

  it('never blocks on an expired hold, whoever placed it', () => {
    const expired = { expiresAt: new Date(NOW.getTime() - 1_000), heldByUserId: OTHER };
    expect(isHoldBlocking(expired, NOW, CUSTOMER)).toBe(false);
    expect(isHoldBlocking(expired, NOW, null)).toBe(false);
  });

  it('treats a hold expiring exactly now as expired, matching the `gt` filter', () => {
    expect(isHoldBlocking(hold({ expiresAt: NOW }), NOW, CUSTOMER)).toBe(false);
  });

  it('blocks an anonymous viewer even on an unowned hold', () => {
    expect(isHoldBlocking(hold({ heldByUserId: null }), NOW, null)).toBe(true);
  });

  it('agrees with blockingHoldFilter about ownership', () => {
    // The in-memory predicate and the Prisma filter must encode one rule, not two.
    const ownHold = hold({ heldByUserId: CUSTOMER });
    expect(isHoldBlocking(ownHold, NOW, CUSTOMER)).toBe(false);
    expect(blockingHoldFilter(NOW, CUSTOMER).NOT?.heldByUserId).toBe(ownHold.heldByUserId);
  });
});
