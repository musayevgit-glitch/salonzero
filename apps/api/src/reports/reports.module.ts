import { Module } from '@nestjs/common';
import { SalonReportsController, SuperadminReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [SalonReportsController, SuperadminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
