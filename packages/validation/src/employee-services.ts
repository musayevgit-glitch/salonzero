import { z } from 'zod';

export const assignEmployeeServiceSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();
export type AssignEmployeeServiceInput = z.infer<typeof assignEmployeeServiceSchema>;
