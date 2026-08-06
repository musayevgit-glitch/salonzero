import { z } from 'zod';

// Minute-of-day range, interpreted in the salon's local timezone (Salon.timezone) — see
// docs/architecture/data-model.md and the WorkingSchedule model comment in schema.prisma.
export const MINUTES_PER_DAY = 1440;

export const createWorkingScheduleSchema = z
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
export type CreateWorkingScheduleInput = z.infer<typeof createWorkingScheduleSchema>;
