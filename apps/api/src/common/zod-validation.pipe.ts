import { type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { validationBadRequest } from './validation-error';

// Shared Zod schemas are the source of truth for request validation (CLAUDE.md → validation-contract
// skill); class-validator is deliberately not used here.
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw validationBadRequest(result.error);
    }
    return result.data;
  }
}
