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
} from '@nestjs/common';
import { InventoryBatchesService } from './inventory-batches.service';
import { CreateInventoryBatchDto } from './dto/create-inventory-batch.dto';
import { UpdateInventoryBatchDto } from './dto/update-inventory-batch.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('inventory-batches')
@ApiBearerAuth()
@Controller('inventory-batches')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryBatchesController {
  private readonly logger = new Logger(InventoryBatchesController.name);

  constructor(
    private readonly inventoryBatchesService: InventoryBatchesService,
  ) {}

  @Post()
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createInventoryBatchDto: CreateInventoryBatchDto) {
    try {
      this.logger.log(`Creating new inventory batch`);
      const result = await this.inventoryBatchesService.create(
        createInventoryBatchDto,
      );
      this.logger.log(`Inventory batch created successfully: ${result.id}`);
      return {
        success: true,
        message: 'Inventory batch created successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create inventory batch';
      this.logger.error(`Failed to create inventory batch: ${message}`);
      throw new HttpException(
        {
          success: false,
          message: message,
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  findAll() {
    return this.inventoryBatchesService.findAll();
  }

  @Get(':id')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.inventoryBatchesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('INVENTORY_STAFF')
  update(
    @Param('id') id: string,
    @Body() updateInventoryBatchDto: UpdateInventoryBatchDto,
  ) {
    return this.inventoryBatchesService.update(+id, updateInventoryBatchDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.inventoryBatchesService.remove(+id);
  }
}
