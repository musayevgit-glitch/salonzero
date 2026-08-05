import { Global, Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

// Global so any future business module can `@UseGuards(RolesGuard)` without re-importing it.
@Global()
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class AuthzModule {}
