import { Module } from '@nestjs/common';
import { PublicSalonsController } from './public-salons.controller';
import { PublicSalonsService } from './public-salons.service';

@Module({
  controllers: [PublicSalonsController],
  providers: [PublicSalonsService],
})
export class PublicModule {}
