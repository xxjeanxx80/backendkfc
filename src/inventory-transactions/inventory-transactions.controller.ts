import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { TransactionType } from './entities/inventory-transaction.entity';

@ApiTags('inventory-transactions')
@ApiBearerAuth()
@Controller('inventory-transactions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryTransactionsController {
  constructor(
    private readonly inventoryTransactionsService: InventoryTransactionsService,
  ) {}

  @Post()
  @Roles('ADMIN', 'INVENTORY_STAFF')
  create(@Body() createInventoryTransactionDto: CreateInventoryTransactionDto) {
    return this.inventoryTransactionsService.create(
      createInventoryTransactionDto,
    );
  }

  @Get()
  @Roles('ADMIN', 'STORE_MANAGER', 'INVENTORY_STAFF')
  @ApiQuery({ name: 'transactionType', required: false, enum: TransactionType })
  @ApiQuery({ name: 'itemId', required: false, type: Number })
  @ApiQuery({ name: 'batchId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query('transactionType') transactionType?: TransactionType,
    @Query('itemId') itemId?: string,
    @Query('batchId') batchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: {
      transactionType?: TransactionType;
      itemId?: number;
      batchId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {};
    
    if (transactionType) {
      filters.transactionType = transactionType;
    }
    
    if (itemId) {
      filters.itemId = parseInt(itemId, 10);
    }
    
    if (batchId) {
      filters.batchId = parseInt(batchId, 10);
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    return this.inventoryTransactionsService.findAll(filters);
  }

  @Get(':id')
  @Roles('ADMIN', 'STORE_MANAGER', 'INVENTORY_STAFF')
  findOne(@Param('id') id: string) {
    return this.inventoryTransactionsService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'INVENTORY_STAFF')
  update(
    @Param('id') id: string,
    @Body() updateInventoryTransactionDto: UpdateInventoryTransactionDto,
  ) {
    return this.inventoryTransactionsService.update(
      +id,
      updateInventoryTransactionDto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'INVENTORY_STAFF')
  remove(@Param('id') id: string) {
    return this.inventoryTransactionsService.remove(+id);
  }
}
