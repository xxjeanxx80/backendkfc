import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptsController } from './goods-receipts.controller';
import {
  GoodsReceipt,
  GoodsReceiptItem,
} from './entities/goods-receipt.entity';
import { PurchaseOrder } from '../procurement/entities/procurement.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { InventoryTransaction } from '../inventory-transactions/entities/inventory-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoodsReceipt,
      GoodsReceiptItem,
      PurchaseOrder,
      InventoryBatch,
      InventoryTransaction,
    ]),
  ],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
