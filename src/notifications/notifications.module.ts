import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PurchaseOrder } from '../procurement/entities/procurement.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { StockRequest } from '../stock-requests/entities/stock-request.entity';
import { Item } from '../items/entities/item.entity';
import { TemperatureModule } from '../temperature/temperature.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, InventoryBatch, StockRequest, Item]),
    forwardRef(() => TemperatureModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

