import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';

// SEC-009: set Cache-Control: no-store on every response except public/* routes (which manage
// their own cache directives) to prevent CDN/browser caching of private tenant data.
@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();
    const req = context.switchToHttp().getRequest<{ path: string }>();

    if (!req.path.startsWith('/public/') && !req.path.startsWith('/uploads/')) {
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('Pragma', 'no-cache');
    }

    return next.handle();
  }
}
