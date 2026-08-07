import { describe, expect, it } from 'vitest';
import { hasPermission } from './permissions';

describe('Centralized RBAC Permissions', () => {
  it('allows SUPERADMIN to perform all operations', () => {
    expect(hasPermission('SUPERADMIN', 'salon.delete')).toBe(true);
    expect(hasPermission('SUPERADMIN', 'employee.create')).toBe(true);
    expect(hasPermission('SUPERADMIN', 'reservation.view')).toBe(true);
    expect(hasPermission('SUPERADMIN', 'audit_log.view')).toBe(true);
  });

  it('allows SALON_ADMIN to manage employee schedules and service categories', () => {
    expect(hasPermission('SALON_ADMIN', 'employee.schedule.manage')).toBe(true);
    expect(hasPermission('SALON_ADMIN', 'category.create')).toBe(true);
    expect(hasPermission('SALON_ADMIN', 'reservation.confirm')).toBe(true);
  });

  it('prevents SALON_ADMIN from performing global platform administration operations', () => {
    expect(hasPermission('SALON_ADMIN', 'salon.create')).toBe(false);
    expect(hasPermission('SALON_ADMIN', 'salon.delete')).toBe(false);
    expect(hasPermission('SALON_ADMIN', 'salon.domain.manage')).toBe(false);
  });

  it('allows SALON_MANAGER to view salon dashboard information and operational views', () => {
    expect(hasPermission('SALON_MANAGER', 'reservation.view')).toBe(true);
    expect(hasPermission('SALON_MANAGER', 'employee.view')).toBe(true);
    expect(hasPermission('SALON_MANAGER', 'service.view')).toBe(true);
  });

  it('prevents SALON_MANAGER from editing salon configuration, settings, or catalogues', () => {
    expect(hasPermission('SALON_MANAGER', 'salon.settings.manage')).toBe(false);
    expect(hasPermission('SALON_MANAGER', 'employee.create')).toBe(false);
    expect(hasPermission('SALON_MANAGER', 'service.create')).toBe(false);
    expect(hasPermission('SALON_MANAGER', 'category.create')).toBe(false);
    expect(hasPermission('SALON_MANAGER', 'audit_log.view')).toBe(false);
  });
});
