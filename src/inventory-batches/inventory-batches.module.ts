import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryBatchesService } from './inventory-batches.service';
import { InventoryBatchesController } from './inventory-batches.controller';
import { InventoryBatch } from './entities/inventory-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryBatch])],
  controllers: [InventoryBatchesController],
  providers: [InventoryBatchesService],
  exports: [InventoryBatchesService],
})
export class InventoryBatchesModule {}
