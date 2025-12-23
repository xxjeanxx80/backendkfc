import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TemperatureSimulatorService } from './temperature-simulator.service';
import { TemperatureMonitoringService } from './temperature-monitoring.service';
import { TemperatureController } from './temperature.controller';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { TemperatureLog } from './entities/temperature-log.entity';
import { Item } from '../items/entities/item.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryBatch, TemperatureLog, Item]),
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  providers: [TemperatureSimulatorService, TemperatureMonitoringService],
  controllers: [TemperatureController],
  exports: [TemperatureSimulatorService, TemperatureMonitoringService],
})
export class TemperatureModule {}


