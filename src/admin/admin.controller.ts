import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Post('inventory/adjust')
  @Roles('ADMIN')
  async adjustInventory(
    @Body()
    body: {
      itemId: number;
      storeId: number;
      batchNo: string;
      quantityChange: number;
      expiryDate?: string;
      notes?: string;
    },
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Admin ${req.user.userId} adjusting inventory: itemId=${body.itemId}, storeId=${body.storeId}, batchNo=${body.batchNo}, quantityChange=${body.quantityChange}`,
      );

      if (!body.itemId || !body.storeId || !body.batchNo || body.quantityChange === undefined) {
        throw new HttpException(
          {
            success: false,
            message: 'Missing required fields: itemId, storeId, batchNo, quantityChange',
            error: 'Validation failed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.adminService.adjustInventory(
        body.itemId,
        body.storeId,
        body.batchNo,
        body.quantityChange,
        body.expiryDate,
        body.notes,
      );

      return {
        success: true,
        message: 'Inventory adjusted successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to adjust inventory';
      this.logger.error(`Failed to adjust inventory: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to adjust inventory',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('temperature/set')
  @Roles('ADMIN')
  async setTemperature(
    @Body()
    body: {
      batchId: number;
      temperature: number;
    },
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Admin ${req.user.userId} setting temperature: batchId=${body.batchId}, temperature=${body.temperature}°C`,
      );

      if (!body.batchId || body.temperature === undefined) {
        throw new HttpException(
          {
            success: false,
            message: 'Missing required fields: batchId, temperature',
            error: 'Validation failed',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.adminService.setTemperature(
        body.batchId,
        body.temperature,
      );

      return {
        success: true,
        message: 'Temperature set successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to set temperature';
      this.logger.error(`Failed to set temperature: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to set temperature',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

