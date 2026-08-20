import { describe, expect, it } from 'vitest';
import { listNotificationsQuerySchema } from './notifications';

describe('listNotificationsQuerySchema', () => {
  it('defaults page and pageSize', () => {
    expect(listNotificationsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      unreadOnly: false,
    });
  });

  it('coerces numeric query strings', () => {
    expect(listNotificationsQuerySchema.parse({ page: '4', pageSize: '5' })).toMatchObject({
      page: 4,
      pageSize: 5,
    });
  });

  it('reads unreadOnly as a boolean from the query string', () => {
    expect(listNotificationsQuerySchema.parse({ unreadOnly: 'true' }).unreadOnly).toBe(true);
    expect(listNotificationsQuerySchema.parse({ unreadOnly: 'false' }).unreadOnly).toBe(false);
  });

  it('rejects a non-boolean unreadOnly', () => {
    expect(() => listNotificationsQuerySchema.parse({ unreadOnly: 'yes' })).toThrow();
  });

  it('caps pageSize so a caller cannot request an unbounded read', () => {
    expect(() => listNotificationsQuerySchema.parse({ pageSize: '1000' })).toThrow();
    expect(() => listNotificationsQuerySchema.parse({ page: '0' })).toThrow();
  });

  // The inbox is always scoped to the token's own user; a userId in the query must not be honoured.
  it('rejects a client-supplied userId', () => {
    expect(() => listNotificationsQuerySchema.parse({ userId: 'someone-else' })).toThrow();
  });
});
