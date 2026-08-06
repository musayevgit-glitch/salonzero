import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioService } from './portfolio/portfolio.service';

@Module({
  controllers: [EmployeesController, PortfolioController],
  providers: [EmployeesService, PortfolioService],
})
export class EmployeesModule {}
