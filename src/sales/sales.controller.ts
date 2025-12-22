import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesTransactionDto } from './dto/create-sales-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('STORE_MANAGER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createSalesTransactionDto: CreateSalesTransactionDto,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Creating sales transaction by user: ${req.user.userId} with role: ${req.user.role}`,
      );

      if (!req.user || !req.user.userId) {
        throw new HttpException(
          {
            success: false,
            message: 'Unauthorized access',
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.salesService.create(
        createSalesTransactionDto,
        req.user.userId,
      );

      return {
        success: true,
        message: 'Sales transaction created successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create sales transaction';
      this.logger.error(`Failed to create sales transaction: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to create sales transaction',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'PROCUREMENT_STAFF')
  findAll(@Query('storeId') storeId?: string) {
    return this.salesService.findAll(storeId ? +storeId : undefined);
  }

  @Get(':id')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'PROCUREMENT_STAFF')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }
}
