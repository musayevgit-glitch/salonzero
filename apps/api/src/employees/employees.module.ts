import { Module } from '@nestjs/common';
import { BreaksController } from './breaks/breaks.controller';
import { BreaksService } from './breaks/breaks.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeServicesController } from './services/employee-services.controller';
import { EmployeeServicesService } from './services/employee-services.service';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioService } from './portfolio/portfolio.service';
import { TimeOffController } from './time-off/time-off.controller';
import { TimeOffService } from './time-off/time-off.service';
import { WorkingScheduleController } from './working-schedule/working-schedule.controller';
import { WorkingScheduleService } from './working-schedule/working-schedule.service';

@Module({
  controllers: [
    EmployeesController,
    PortfolioController,
    EmployeeServicesController,
    WorkingScheduleController,
    BreaksController,
    TimeOffController,
  ],
  providers: [
    EmployeesService,
    PortfolioService,
    EmployeeServicesService,
    WorkingScheduleService,
    BreaksService,
    TimeOffService,
  ],
})
export class EmployeesModule {}
