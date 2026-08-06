import { describe, expect, it } from 'vitest';
import { createReservationSchema } from './reservations';

const VALID = {
  salonId: '11111111-1111-1111-1111-111111111111',
  serviceId: '22222222-2222-2222-2222-222222222222',
  startAt: '2026-08-10T09:00:00.000Z',
  idempotencyKey: '33333333-3333-3333-3333-333333333333',
};

describe('createReservationSchema', () => {
  it('accepts a minimal valid payload (any suitable stylist)', () => {
    expect(createReservationSchema.parse(VALID)).toEqual(VALID);
  });

  it('accepts an explicit employeeId, null employeeId, and a customerNote', () => {
    const employeeId = '44444444-4444-4444-4444-444444444444';
    expect(createReservationSchema.parse({ ...VALID, employeeId })).toEqual({
      ...VALID,
      employeeId,
    });
    expect(createReservationSchema.parse({ ...VALID, employeeId: null })).toEqual({
      ...VALID,
      employeeId: null,
    });
    expect(
      createReservationSchema.parse({ ...VALID, customerNote: 'Please use unscented products' }),
    ).toEqual({ ...VALID, customerNote: 'Please use unscented products' });
  });

  it('rejects missing required fields', () => {
    expect(() => createReservationSchema.parse({ ...VALID, salonId: undefined })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, serviceId: undefined })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, startAt: undefined })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, idempotencyKey: undefined })).toThrow();
  });

  it('rejects malformed IDs and datetimes', () => {
    expect(() => createReservationSchema.parse({ ...VALID, salonId: 'not-a-uuid' })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, startAt: 'not-a-date' })).toThrow();
    expect(() =>
      createReservationSchema.parse({ ...VALID, idempotencyKey: 'not-a-uuid' }),
    ).toThrow();
  });

  it('rejects a customerNote over the length cap', () => {
    expect(() =>
      createReservationSchema.parse({ ...VALID, customerNote: 'x'.repeat(1001) }),
    ).toThrow();
  });

  it('rejects forbidden/protected fields (mass assignment)', () => {
    expect(() => createReservationSchema.parse({ ...VALID, customerId: 'forged' })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, priceAmount: 1 })).toThrow();
    expect(() => createReservationSchema.parse({ ...VALID, status: 'CONFIRMED' })).toThrow();
  });
});
