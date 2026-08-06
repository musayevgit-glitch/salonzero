import { BadRequestException } from '@nestjs/common';
import type { ZodError } from 'zod';

export function validationBadRequest(error: ZodError): BadRequestException {
  if (process.env.NODE_ENV === 'production') {
    return new BadRequestException({ message: 'Invalid request body.' });
  }
  return new BadRequestException(error.flatten());
}
