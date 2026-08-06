import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  confirmPortfolioItemSchema,
  reorderPortfolioSchema,
  requestPortfolioUploadSchema,
  updatePortfolioItemSchema,
  type ConfirmPortfolioItemInput,
  type ReorderPortfolioInput,
  type RequestPortfolioUploadInput,
  type UpdatePortfolioItemInput,
} from '@salonomia/validation';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../../auth/guards/authenticated.guard';
import type { AuthenticatedUser } from '../../auth/types';
import { CurrentSalonContext, type SalonContext } from '../../authz/salon-context';
import { Roles } from '../../authz/roles.decorator';
import { RolesGuard } from '../../authz/roles.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { PortfolioService } from './portfolio.service';

@Controller('salons/:salonId/employees/:employeeId/portfolio')
@UseGuards(AuthenticatedGuard, RolesGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @Get()
  list(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
  ) {
    return this.portfolioService.list(ctx.salonId, employeeId);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post('upload-url')
  requestUpload(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(requestPortfolioUploadSchema)) body: RequestPortfolioUploadInput,
  ) {
    return this.portfolioService.requestUpload(ctx.salonId, employeeId, body);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(201)
  @Post()
  confirm(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(confirmPortfolioItemSchema)) body: ConfirmPortfolioItemInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portfolioService.confirm(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Patch(':itemId')
  update(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('itemId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) itemId: string,
    @Body(new ZodValidationPipe(updatePortfolioItemSchema)) body: UpdatePortfolioItemInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portfolioService.update(ctx.salonId, employeeId, itemId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(200)
  @Post('reorder')
  reorder(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Body(new ZodValidationPipe(reorderPortfolioSchema)) body: ReorderPortfolioInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.portfolioService.reorder(ctx.salonId, employeeId, body, user.id);
  }

  @Roles('SUPERADMIN', 'SALON_ADMIN')
  @HttpCode(204)
  @Delete(':itemId')
  async remove(
    @CurrentSalonContext() ctx: SalonContext,
    @Param('employeeId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) employeeId: string,
    @Param('itemId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.portfolioService.remove(ctx.salonId, employeeId, itemId, user.id);
  }
}
