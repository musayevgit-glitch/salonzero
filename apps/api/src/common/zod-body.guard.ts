import { BadRequestException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ZodSchema } from 'zod';

// Validates req.body against a Zod schema as a guard (not a pipe) — needed for routes like
// POST /auth/login where a passport AuthGuard reads req.body directly before any pipe would run.
export class ZodBodyGuard implements CanActivate {
  constructor(private readonly schema: ZodSchema) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const result = this.schema.safeParse(request.body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    request.body = result.data;
    return true;
  }
}
