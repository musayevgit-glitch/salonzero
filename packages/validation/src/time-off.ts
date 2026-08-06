import { z } from 'zod';

// Absolute UTC instants (TimeOff.startAt/endAt), not weekday/minute-of-day — the client is
// responsible for converting a salon-local wall-clock selection to UTC before sending.
export const createTimeOffSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    reason: z.string().trim().min(1).max(500).optional(),
    // Set only on a resubmission after the caller has seen and explicitly accepted the
    // conflicting-reservations list returned by a first attempt — see Prompt 14.3's "do not
    // silently cancel reservations; surface conflicts for explicit admin action".
    acknowledgeConflicts: z.boolean().optional(),
  })
  .strict()
  .refine((obj) => new Date(obj.endAt).getTime() > new Date(obj.startAt).getTime(), {
    message: 'endAt must be after startAt.',
    path: ['endAt'],
  });
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;
