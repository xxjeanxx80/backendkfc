import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { PurchaseOrder } from '../procurement/entities/procurement.entity';
import { SalesTransaction } from '../sales/entities/sales-transaction.entity';
import { Item } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryBatch,
      PurchaseOrder,
      SalesTransaction,
      Item,
    ]),
    ItemsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
