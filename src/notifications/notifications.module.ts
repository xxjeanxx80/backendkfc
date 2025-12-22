import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PurchaseOrder } from '../procurement/entities/procurement.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { StockRequest } from '../stock-requests/entities/stock-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, InventoryBatch, StockRequest]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

