import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockRequest } from './entities/stock-request.entity';
import { StockRequestsService } from './stock-requests.service';
import { StockRequestsController } from './stock-requests.controller';
import { SupplierItemsModule } from '../supplier-items/supplier-items.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { ItemsModule } from '../items/items.module';
import { Item } from '../items/entities/item.entity';
import { Store } from '../stores/entities/store.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockRequest, Item, Store, InventoryBatch]),
    SupplierItemsModule,
    ProcurementModule,
    ItemsModule,
  ],
  controllers: [StockRequestsController],
  providers: [StockRequestsService],
  exports: [StockRequestsService],
})
export class StockRequestsModule {}
