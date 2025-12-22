import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Item } from '../items/entities/item.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryTransaction, Item, InventoryBatch, User])],
  controllers: [InventoryTransactionsController],
  providers: [InventoryTransactionsService],
  exports: [InventoryTransactionsService],
})
export class InventoryTransactionsModule {}
