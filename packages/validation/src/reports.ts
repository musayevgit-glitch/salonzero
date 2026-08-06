import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const salonReportQuerySchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .strict()
  .refine((d) => d.from <= d.to, { message: 'from must be ≤ to', path: ['from'] });
export type SalonReportQuery = z.infer<typeof salonReportQuerySchema>;

export const auditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    action: z.string().max(100).optional(),
    targetType: z.string().max(100).optional(),
    actorUserId: z.string().uuid().optional(),
  })
  .strict();
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
