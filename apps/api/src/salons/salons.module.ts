import { Module } from '@nestjs/common';
import { TokenService } from '../auth/token.service';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';

@Module({
  controllers: [SalonsController],
  providers: [SalonsService, TokenService],
})
export class SalonsModule {}
