import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeServicesController } from './services/employee-services.controller';
import { EmployeeServicesService } from './services/employee-services.service';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioService } from './portfolio/portfolio.service';

@Module({
  controllers: [EmployeesController, PortfolioController, EmployeeServicesController],
  providers: [EmployeesService, PortfolioService, EmployeeServicesService],
})
export class EmployeesModule {}
