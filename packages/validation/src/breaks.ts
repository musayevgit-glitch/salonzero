import { z } from 'zod';
import { MINUTES_PER_DAY } from './working-schedule';

// Recurring weekly breaks only — the approved data model (schema.prisma Break model) has no
// date-specific break table, matching the same weekday/minute-of-day shape as WorkingSchedule.
export const createBreakSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinuteOfDay: z
      .number()
      .int()
      .min(0)
      .max(MINUTES_PER_DAY - 1),
    endMinuteOfDay: z.number().int().min(1).max(MINUTES_PER_DAY),
  })
  .strict()
  .refine((obj) => obj.endMinuteOfDay > obj.startMinuteOfDay, {
    message: 'endMinuteOfDay must be after startMinuteOfDay (no reversed intervals).',
    path: ['endMinuteOfDay'],
  });
export type CreateBreakInput = z.infer<typeof createBreakSchema>;
