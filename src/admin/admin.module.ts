import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { Item } from '../items/entities/item.entity';
import { Store } from '../stores/entities/store.entity';
import { ItemsModule } from '../items/items.module';
import { InventoryBatchesModule } from '../inventory-batches/inventory-batches.module';
import { StoresModule } from '../stores/stores.module';
import { TemperatureModule } from '../temperature/temperature.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryBatch, Item, Store]),
    ItemsModule,
    InventoryBatchesModule,
    StoresModule,
    forwardRef(() => TemperatureModule),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
