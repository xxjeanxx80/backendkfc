import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
  UsePipes,
  Request,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('procurement')
@ApiBearerAuth()
@Controller('procurement')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProcurementController {
  private readonly logger = new Logger(ProcurementController.name);

  constructor(private readonly procurementService: ProcurementService) {}

  @Post()
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createProcurementDto: CreateProcurementDto,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Creating new purchase order by user: ${req.user.userId} with role: ${req.user.role}`,
      );

      // Validate user permissions
      if (!req.user || !req.user.role) {
        this.logger.warn(
          `Unauthorized access attempt to create purchase order`,
        );
        throw new HttpException(
          {
            success: false,
            message: 'Unauthorized access',
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Validate required roles
      const requiredRoles = ['PROCUREMENT_STAFF', 'ADMIN'];
      if (!requiredRoles.includes(req.user.role)) {
        this.logger.warn(
          `Access denied for user ${req.user.userId} with role ${req.user.role}`,
        );
        throw new HttpException(
          {
            success: false,
            message: 'Forbidden resource',
            error: `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      const result = await this.procurementService.create(createProcurementDto);
      this.logger.log(
        `Purchase order created successfully: ${result.id} by user: ${req.user.userId}`,
      );
      return {
        success: true,
        message: 'Purchase order created successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create purchase order';
      this.logger.error(`Failed to create purchase order: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to create purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'INVENTORY_STAFF', 'ADMIN')
  findAll(@Request() req: { query: { status?: string; supplierId?: string } }) {
    if (req.query?.status === 'pending_approval') {
      return this.procurementService.findPendingApprovals();
    }
    const supplierId = req.query?.supplierId ? +req.query.supplierId : undefined;
    return this.procurementService.findAll(supplierId);
  }

  @Get(':id')
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'INVENTORY_STAFF', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.procurementService.findOne(+id);
  }

  @Patch(':id')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateProcurementDto: UpdateProcurementDto,
  ) {
    return this.procurementService.update(+id, updateProcurementDto);
  }

  @Post(':id/approve')
  @Roles('STORE_MANAGER', 'ADMIN')
  async approve(
    @Param('id') id: string,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      const result = await this.procurementService.approve(+id, req.user.userId);
      return {
        success: true,
        message: 'Purchase order approved successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to approve purchase order';
      this.logger.error(`Failed to approve purchase order: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to approve purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/reject')
  @Roles('STORE_MANAGER', 'ADMIN')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      const result = await this.procurementService.reject(
        +id,
        req.user.userId,
        body.reason,
      );
      return {
        success: true,
        message: 'Purchase order rejected successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reject purchase order';
      this.logger.error(`Failed to reject purchase order: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to reject purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/send')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  async send(@Param('id') id: string) {
    try {
      const result = await this.procurementService.send(+id);
      return {
        success: true,
        message: 'Purchase order sent successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send purchase order';
      this.logger.error(`Failed to send purchase order: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to send purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/confirm')
  @Roles('ADMIN')
  async confirm(
    @Param('id') id: string,
    @Body() body: { expectedDeliveryDate?: string; supplierNotes?: string },
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      const result = await this.procurementService.confirm(
        +id,
        req.user.userId,
        body.expectedDeliveryDate,
        body.supplierNotes,
      );
      return {
        success: true,
        message: 'Purchase order confirmed by supplier',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to confirm purchase order';
      this.logger.error(`Failed to confirm purchase order: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to confirm purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/receive')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  async receive(
    @Param('id') id: string,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      const result = await this.procurementService.receive(+id, req.user.userId);
      return {
        success: true,
        message: 'Purchase order received successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to receive purchase order';
      this.logger.error(`Failed to receive purchase order: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to receive purchase order',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/reject-receipt')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  async rejectReceipt(
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      if (!body.rejectionReason || !body.rejectionReason.trim()) {
        throw new HttpException(
          {
            success: false,
            message: 'Rejection reason is required',
            error: 'Rejection reason cannot be empty',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.procurementService.rejectReceipt(
        +id,
        req.user.userId,
        body.rejectionReason.trim(),
      );
      return {
        success: true,
        message: 'Purchase order receipt rejected successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reject receipt';
      this.logger.error(`Failed to reject receipt: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to reject receipt',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.procurementService.remove(+id);
  }
}
