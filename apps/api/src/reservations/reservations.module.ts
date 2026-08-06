import { Module } from '@nestjs/common';
import { CustomerTransitionsController } from './customer-transitions.controller';
import { ManualReservationsController } from './manual-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { StaffTransitionsController } from './staff-transitions.controller';
import { TransitionsService } from './transitions.service';

@Module({
  controllers: [
    ReservationsController,
    ManualReservationsController,
    StaffTransitionsController,
    CustomerTransitionsController,
  ],
  providers: [ReservationsService, TransitionsService],
})
export class ReservationsModule {}
