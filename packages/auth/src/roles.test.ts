import { describe, expect, it } from 'vitest';
import { ROLES } from './roles';

describe('ROLES', () => {
  it('contains exactly the four Salonomia roles', () => {
    expect(ROLES).toEqual(['SUPERADMIN', 'SALON_ADMIN', 'SALON_MANAGER', 'CUSTOMER']);
  });
});
