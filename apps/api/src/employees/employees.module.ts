import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeServicesController } from './services/employee-services.controller';
import { EmployeeServicesService } from './services/employee-services.service';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioService } from './portfolio/portfolio.service';
import { WorkingScheduleController } from './working-schedule/working-schedule.controller';
import { WorkingScheduleService } from './working-schedule/working-schedule.service';

@Module({
  controllers: [
    EmployeesController,
    PortfolioController,
    EmployeeServicesController,
    WorkingScheduleController,
  ],
  providers: [EmployeesService, PortfolioService, EmployeeServicesService, WorkingScheduleService],
})
export class EmployeesModule {}
