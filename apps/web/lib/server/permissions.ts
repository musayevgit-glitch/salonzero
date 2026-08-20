import { SalonRole } from './salon-context';

export type Permission =
  | 'salon.view'
  | 'salon.create'
  | 'salon.update'
  | 'salon.delete'
  | 'salon.activate'
  | 'salon.deactivate'
  | 'salon.settings.view'
  | 'salon.settings.manage'
  | 'salon.rules.manage'
  | 'salon.schedule.manage'
  | 'salon.domain.manage'
  | 'employee.view'
  | 'employee.create'
  | 'employee.update'
  | 'employee.activate'
  | 'employee.deactivate'
  | 'employee.delete'
  | 'employee.schedule.view'
  | 'employee.schedule.manage'
  | 'employee.portfolio.view'
  | 'employee.portfolio.manage'
  | 'employee.services.view'
  | 'employee.services.manage'
  | 'employee.reports.view'
  | 'service.view'
  | 'service.create'
  | 'service.update'
  | 'service.activate'
  | 'service.deactivate'
  | 'service.delete'
  | 'category.view'
  | 'category.create'
  | 'category.update'
  | 'category.reorder'
  | 'category.deactivate'
  | 'reservation.view'
  | 'reservation.create'
  | 'reservation.update'
  | 'reservation.cancel'
  | 'reservation.confirm'
  | 'reservation.reschedule'
  | 'reservation.status.update'
  | 'reservation.assign_employee'
  | 'reservation.manual.create'
  | 'reservation.notes.manage'
  | 'customer.view'
  | 'customer.create'
  | 'customer.update'
  | 'customer.history.view'
  | 'customer.notes.manage'
  | 'report.global.view'
  | 'report.salon.view'
  | 'report.employee.view'
  | 'report.service.view'
  | 'report.customer.view'
  | 'report.export'
  | 'user.view'
  | 'user.create'
  | 'user.update'
  | 'user.activate'
  | 'user.deactivate'
  | 'role.manage'
  | 'permission.manage'
  | 'audit_log.view'
  | 'notification.manage';

export const ROLE_PERMISSIONS: Record<SalonRole, Permission[]> = {
  SUPERADMIN: [
    'salon.view',
    'salon.create',
    'salon.update',
    'salon.delete',
    'salon.activate',
    'salon.deactivate',
    'salon.settings.view',
    'salon.settings.manage',
    'salon.rules.manage',
    'salon.schedule.manage',
    'salon.domain.manage',
    'employee.view',
    'employee.create',
    'employee.update',
    'employee.activate',
    'employee.deactivate',
    'employee.delete',
    'employee.schedule.view',
    'employee.schedule.manage',
    'employee.portfolio.view',
    'employee.portfolio.manage',
    'employee.services.view',
    'employee.services.manage',
    'employee.reports.view',
    'service.view',
    'service.create',
    'service.update',
    'service.activate',
    'service.deactivate',
    'service.delete',
    'category.view',
    'category.create',
    'category.update',
    'category.reorder',
    'category.deactivate',
    'reservation.view',
    'reservation.create',
    'reservation.update',
    'reservation.cancel',
    'reservation.confirm',
    'reservation.reschedule',
    'reservation.status.update',
    'reservation.assign_employee',
    'reservation.manual.create',
    'reservation.notes.manage',
    'customer.view',
    'customer.create',
    'customer.update',
    'customer.history.view',
    'customer.notes.manage',
    'report.global.view',
    'report.salon.view',
    'report.employee.view',
    'report.service.view',
    'report.customer.view',
    'report.export',
    'user.view',
    'user.create',
    'user.update',
    'user.activate',
    'user.deactivate',
    'role.manage',
    'permission.manage',
    'audit_log.view',
    'notification.manage',
  ],
  SALON_ADMIN: [
    'salon.view',
    'salon.settings.view',
    'salon.settings.manage',
    'salon.rules.manage',
    'salon.schedule.manage',
    'employee.view',
    'employee.create',
    'employee.update',
    'employee.activate',
    'employee.deactivate',
    'employee.schedule.view',
    'employee.schedule.manage',
    'employee.portfolio.view',
    'employee.portfolio.manage',
    'employee.services.view',
    'employee.services.manage',
    'employee.reports.view',
    'service.view',
    'service.create',
    'service.update',
    'service.activate',
    'service.deactivate',
    'category.view',
    'category.create',
    'category.update',
    'category.reorder',
    'category.deactivate',
    'reservation.view',
    'reservation.create',
    'reservation.update',
    'reservation.cancel',
    'reservation.confirm',
    'reservation.reschedule',
    'reservation.status.update',
    'reservation.assign_employee',
    'reservation.manual.create',
    'reservation.notes.manage',
    'customer.view',
    'customer.create',
    'customer.update',
    'customer.history.view',
    'customer.notes.manage',
    'report.salon.view',
    'report.employee.view',
    'report.service.view',
    'report.customer.view',
    'report.export',
    'audit_log.view',
  ],
  SALON_MANAGER: [
    'salon.view',
    'employee.view',
    'employee.schedule.view',
    'employee.portfolio.view',
    'employee.services.view',
    'service.view',
    'category.view',
    'reservation.view',
    'reservation.create',
    'reservation.update',
    'reservation.cancel',
    'reservation.confirm',
    'reservation.reschedule',
    'reservation.status.update',
    'reservation.assign_employee',
    'reservation.manual.create',
    'reservation.notes.manage',
    'customer.view',
    'customer.create',
    'customer.update',
    'customer.history.view',
    'customer.notes.manage',
    'report.employee.view',
    'report.service.view',
    'report.customer.view',
  ],
};

export function hasPermission(role: SalonRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
