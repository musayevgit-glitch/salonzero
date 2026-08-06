import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AssignEmployeeServiceInput } from '@salonomia/validation';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface AssignedServiceItem {
  id: string;
  name: string;
  categoryId: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
}

@Injectable()
export class EmployeeServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertEmployeeInSalon(salonId: string, employeeId: string): Promise<void> {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }
  }

  async list(salonId: string, employeeId: string): Promise<AssignedServiceItem[]> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const assignments = await this.prisma.employeeService.findMany({
      where: { employeeId },
      select: {
        service: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            priceAmount: true,
            currency: true,
            durationMinutes: true,
            isActive: true,
          },
        },
      },
    });

    return assignments.map((a) => a.service);
  }

  async assign(
    salonId: string,
    employeeId: string,
    input: AssignEmployeeServiceInput,
    actorUserId: string,
  ): Promise<AssignedServiceItem> {
    // Both employee and service ownership are re-derived from the authorized salonId — a
    // client-supplied serviceId is never trusted on its own, only after confirming it belongs
    // to the same salon as the (already guard-verified) employee.
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
    });
    if (!employee) {
      throw new NotFoundException();
    }
    if (!employee.isActive) {
      throw new BadRequestException('Cannot assign services to an inactive employee.');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: input.serviceId, salonId },
    });
    if (!service) {
      throw new BadRequestException('serviceId must reference a service in this salon.');
    }
    if (!service.isActive) {
      throw new BadRequestException('Cannot assign an inactive service.');
    }

    const existing = await this.prisma.employeeService.findUnique({
      where: { employeeId_serviceId: { employeeId, serviceId: input.serviceId } },
    });
    if (existing) {
      throw new ConflictException('This service is already assigned to this employee.');
    }

    await this.prisma.employeeService.create({
      data: { employeeId, serviceId: input.serviceId },
    });

    await this.audit.record({
      actorUserId,
      action: 'employee_service.assigned',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { serviceId: input.serviceId },
    });

    return {
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      priceAmount: service.priceAmount,
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive,
    };
  }

  async unassign(
    salonId: string,
    employeeId: string,
    serviceId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    // Requiring the service to also belong to this salon closes off using this route to probe
    // whether a serviceId exists anywhere in the system.
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException();
    }

    const existing = await this.prisma.employeeService.findUnique({
      where: { employeeId_serviceId: { employeeId, serviceId } },
    });
    if (!existing) {
      throw new NotFoundException();
    }

    await this.prisma.employeeService.delete({
      where: { employeeId_serviceId: { employeeId, serviceId } },
    });

    await this.audit.record({
      actorUserId,
      action: 'employee_service.unassigned',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { serviceId },
    });
  }
}
