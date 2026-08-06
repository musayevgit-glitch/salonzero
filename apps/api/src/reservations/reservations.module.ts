import { Module } from '@nestjs/common';
import { CustomerReservationsController } from './customer-reservations.controller';
import { CustomerReservationsService } from './customer-reservations.service';
import { CustomerTransitionsController } from './customer-transitions.controller';
import { ManualReservationsController } from './manual-reservations.controller';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { StaffReservationsController } from './staff-reservations.controller';
import { StaffReservationsService } from './staff-reservations.service';
import { StaffTransitionsController } from './staff-transitions.controller';
import { TransitionsService } from './transitions.service';

@Module({
  controllers: [
    ReservationsController,
    ManualReservationsController,
    StaffReservationsController,
    StaffTransitionsController,
    CustomerTransitionsController,
    CustomerReservationsController,
  ],
  providers: [
    ReservationsService,
    StaffReservationsService,
    TransitionsService,
    CustomerReservationsService,
  ],
})
export class ReservationsModule {}
