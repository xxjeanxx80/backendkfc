import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { Item } from './entities/item.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { SalesTransaction } from '../sales/entities/sales-transaction.entity';
import { StockRequestsModule } from '../stock-requests/stock-requests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, InventoryBatch, SalesTransaction]),
    forwardRef(() => StockRequestsModule),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
