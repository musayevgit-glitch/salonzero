import { describe, expect, it } from 'vitest';
import { createRatingSchema, listSalonRatingsQuerySchema } from './ratings';

const RESERVATION_ID = '11111111-1111-4111-8111-111111111111';

describe('createRatingSchema', () => {
  it('accepts a minimal rating', () => {
    expect(createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 5 })).toEqual({
      reservationId: RESERVATION_ID,
      stars: 5,
      comment: undefined,
    });
  });

  it('accepts an optional comment and trims it', () => {
    expect(
      createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 4, comment: '  great  ' }),
    ).toEqual({ reservationId: RESERVATION_ID, stars: 4, comment: 'great' });
  });

  it('treats a blank comment as absent rather than an empty string', () => {
    expect(
      createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 3, comment: '   ' }).comment,
    ).toBeUndefined();
  });

  it('rejects stars outside 1..5 and non-integers', () => {
    for (const stars of [0, 6, -1, 2.5, 100]) {
      expect(() => createRatingSchema.parse({ reservationId: RESERVATION_ID, stars })).toThrow();
    }
  });

  it('rejects a malformed reservationId', () => {
    expect(() => createRatingSchema.parse({ reservationId: 'not-a-uuid', stars: 5 })).toThrow();
  });

  it('rejects an oversized comment', () => {
    expect(() =>
      createRatingSchema.parse({
        reservationId: RESERVATION_ID,
        stars: 5,
        comment: 'x'.repeat(1001),
      }),
    ).toThrow();
  });

  // The salon a rating counts towards is copied from the reservation server-side. Accepting a
  // client-supplied salonId (or customerId) would let a caller credit a salon it never visited.
  it('rejects client-supplied ownership fields (mass assignment)', () => {
    expect(() =>
      createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 5, salonId: 'forged' }),
    ).toThrow();
    expect(() =>
      createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 5, customerId: 'forged' }),
    ).toThrow();
    expect(() =>
      createRatingSchema.parse({ reservationId: RESERVATION_ID, stars: 5, createdAt: '2026-01-01' }),
    ).toThrow();
  });
});

describe('listSalonRatingsQuerySchema', () => {
  it('defaults page and pageSize', () => {
    expect(listSalonRatingsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20, stars: undefined });
  });

  it('coerces numeric query strings', () => {
    expect(listSalonRatingsQuerySchema.parse({ page: '3', pageSize: '10', stars: '4' })).toEqual({
      page: 3,
      pageSize: 10,
      stars: 4,
    });
  });

  it('caps pageSize so a caller cannot request an unbounded read', () => {
    expect(() => listSalonRatingsQuerySchema.parse({ pageSize: '5000' })).toThrow();
  });

  it('rejects an out-of-range star filter', () => {
    expect(() => listSalonRatingsQuerySchema.parse({ stars: '0' })).toThrow();
    expect(() => listSalonRatingsQuerySchema.parse({ stars: '6' })).toThrow();
  });

  // salonId comes from the authorized route context, never from the query string.
  it('rejects an unknown filter such as salonId', () => {
    expect(() => listSalonRatingsQuerySchema.parse({ salonId: 'other-tenant' })).toThrow();
  });
});
