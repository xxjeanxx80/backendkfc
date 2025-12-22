import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesTransaction } from './entities/sales-transaction.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { InventoryTransaction } from '../inventory-transactions/entities/inventory-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesTransaction,
      InventoryBatch,
      InventoryTransaction,
    ]),
  ],
  providers: [SalesService],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule {}
