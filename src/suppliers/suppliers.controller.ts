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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SuppliersController {
  private readonly logger = new Logger(SuppliersController.name);

  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Creating new supplier by user: ${req.user.userId} with role: ${req.user.role}`,
      );

      // Validate user permissions
      if (!req.user || !req.user.role) {
        this.logger.warn(`Unauthorized access attempt to create supplier`);
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

      const result = await this.suppliersService.create(createSupplierDto);
      this.logger.log(
        `Supplier created successfully: ${result.id} by user: ${req.user.userId}`,
      );
      return {
        success: true,
        message: 'Supplier created successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create supplier';
      this.logger.error(`Failed to create supplier: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to create supplier',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(+id);
  }

  @Patch(':id')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(+id, updateSupplierDto);
  }

  @Delete(':id')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(+id);
  }
}
