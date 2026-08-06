import { describe, expect, it } from 'vitest';
import {
  createManualReservationSchema,
  createReservationSchema,
  reservationReasonSchema,
  rescheduleReservationSchema,
} from './reservations';

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

const VALID_MANUAL = {
  customerEmail: 'customer@example.com',
  customerFullName: 'Jane Doe',
  serviceId: '22222222-2222-2222-2222-222222222222',
  startAt: '2026-08-10T09:00:00.000Z',
};

describe('createManualReservationSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(createManualReservationSchema.parse(VALID_MANUAL)).toEqual(VALID_MANUAL);
  });

  it('lowercases the email, matching the shared auth email normalization', () => {
    expect(
      createManualReservationSchema.parse({
        ...VALID_MANUAL,
        customerEmail: 'Customer@Example.com',
      }).customerEmail,
    ).toBe('customer@example.com');
  });

  it('accepts employeeId, customerNote, and an optional idempotencyKey', () => {
    const full = {
      ...VALID_MANUAL,
      employeeId: '44444444-4444-4444-4444-444444444444',
      customerNote: 'Regular customer',
      idempotencyKey: '33333333-3333-3333-3333-333333333333',
    };
    expect(createManualReservationSchema.parse(full)).toEqual(full);
  });

  it('rejects an invalid email', () => {
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, customerEmail: 'not-an-email' }),
    ).toThrow();
  });

  it('rejects missing required fields, including customerFullName (regardless of whether the account exists — no existence oracle)', () => {
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, customerEmail: undefined }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, customerFullName: undefined }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, serviceId: undefined }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, startAt: undefined }),
    ).toThrow();
  });

  it('rejects forbidden/protected fields (mass assignment)', () => {
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, salonId: 'forged' }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, priceAmount: 1 }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, status: 'CONFIRMED' }),
    ).toThrow();
    expect(() =>
      createManualReservationSchema.parse({ ...VALID_MANUAL, idempotencyKey: 'not-a-uuid' }),
    ).toThrow();
  });
});

describe('reservationReasonSchema', () => {
  it('accepts an empty payload and a payload with a reason', () => {
    expect(reservationReasonSchema.parse({})).toEqual({});
    expect(reservationReasonSchema.parse({ reason: 'No longer needed' })).toEqual({
      reason: 'No longer needed',
    });
  });

  it('rejects an empty-string or over-length reason', () => {
    expect(() => reservationReasonSchema.parse({ reason: '' })).toThrow();
    expect(() => reservationReasonSchema.parse({ reason: 'x'.repeat(501) })).toThrow();
  });

  it('rejects forbidden fields', () => {
    expect(() => reservationReasonSchema.parse({ reason: 'ok', status: 'REJECTED' })).toThrow();
  });
});

describe('rescheduleReservationSchema', () => {
  const VALID_RESCHEDULE = { startAt: '2026-08-10T09:00:00.000Z' };

  it('accepts a minimal valid payload and an optional employeeId', () => {
    expect(rescheduleReservationSchema.parse(VALID_RESCHEDULE)).toEqual(VALID_RESCHEDULE);
    const withEmployee = {
      ...VALID_RESCHEDULE,
      employeeId: '44444444-4444-4444-4444-444444444444',
    };
    expect(rescheduleReservationSchema.parse(withEmployee)).toEqual(withEmployee);
  });

  it('rejects a missing or malformed startAt', () => {
    expect(() => rescheduleReservationSchema.parse({})).toThrow();
    expect(() => rescheduleReservationSchema.parse({ startAt: 'not-a-date' })).toThrow();
  });

  it('rejects a malformed employeeId and forbidden fields', () => {
    expect(() =>
      rescheduleReservationSchema.parse({ ...VALID_RESCHEDULE, employeeId: 'not-a-uuid' }),
    ).toThrow();
    expect(() =>
      rescheduleReservationSchema.parse({ ...VALID_RESCHEDULE, status: 'CONFIRMED' }),
    ).toThrow();
  });
});
