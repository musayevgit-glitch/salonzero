import { z } from 'zod';

// Public, unauthenticated salon discovery (Section 17.1). Only fields that
// docs/security/data-classification.md marks Public are ever returned by the service that consumes
// this query — this schema only validates shape/bounds of the request itself.
//
// "rating"/"availability" filters from docs/product/product-spec.md's discovery list are
// deliberately not implemented here: there is no Review/rating data model in the approved schema
// (Section 8), and a real-time availability filter across every listed salon would require running
// the full booking-availability engine per salon on every discovery request — both are schema/
// architecture decisions of their own, not safe defaults, so they're deferred (see
// docs/product/open-decisions.md pattern from Section 14.3) rather than improvised. Likewise, price
// *sorting* would need a denormalized/aggregate column or a raw query to be efficient; only price
// *filtering* ("has an active service in this range") is implemented, which Prisma's relation
// `some` filter expresses directly.
export const listPublicSalonsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    city: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    genderFocus: z.enum(['WOMEN', 'MEN', 'UNISEX']).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sort: z.enum(['name_asc', 'name_desc', 'newest']).default('name_asc'),
  })
  .strict()
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice must not be greater than maxPrice',
    path: ['minPrice'],
  });
export type ListPublicSalonsQuery = z.infer<typeof listPublicSalonsQuerySchema>;
