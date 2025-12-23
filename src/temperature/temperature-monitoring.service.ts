import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class TemperatureMonitoringService {
  private readonly logger = new Logger(TemperatureMonitoringService.name);
  
  // Track thời gian nhiệt độ bất thường cho mỗi batch
  private abnormalTemperatureStart = new Map<number, Date>();

  constructor(
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  /**
   * Check nhiệt độ của tất cả batches và tạo alerts nếu cần
   */
  async checkTemperatureAlerts(): Promise<void> {
    try {
      const batches = await this.inventoryBatchRepository.find({
        where: { quantityOnHand: MoreThanOrEqual(1) },
        relations: ['item'],
      });

      for (const batch of batches) {
        if (!batch.item || batch.temperature === null || batch.temperature === undefined) {
          continue;
        }

        const item = batch.item;
        const storageType = item.storageType || 'cold';
        const minTemp = item.minTemperature ?? (storageType === 'frozen' ? -18 : 2);
        const maxTemp = item.maxTemperature ?? (storageType === 'frozen' ? -15 : 8);

        const currentTemp = batch.temperature;
        const isAbnormal = currentTemp < minTemp || currentTemp > maxTemp;

        if (isAbnormal) {
          // Track thời gian bất thường
          if (!this.abnormalTemperatureStart.has(batch.id)) {
            this.abnormalTemperatureStart.set(batch.id, new Date());
            this.logger.warn(
              `Temperature alert started for batch ${batch.batchNo} (${item.itemName}): ${currentTemp}°C (range: ${minTemp}-${maxTemp}°C)`,
            );
          } else {
            // Check xem có vượt quá 5 phút không
            const startTime = this.abnormalTemperatureStart.get(batch.id)!;
            const minutesAbnormal = (Date.now() - startTime.getTime()) / 1000 / 60;
            
            if (minutesAbnormal > 5) {
              this.logger.error(
                `Critical temperature alert for batch ${batch.batchNo} (${item.itemName}): ${currentTemp}°C abnormal for ${minutesAbnormal.toFixed(1)} minutes`,
              );
            }
          }
        } else {
          // Nhiệt độ đã trở về bình thường
          if (this.abnormalTemperatureStart.has(batch.id)) {
            const startTime = this.abnormalTemperatureStart.get(batch.id)!;
            const duration = (Date.now() - startTime.getTime()) / 1000 / 60;
            this.logger.log(
              `Temperature normalized for batch ${batch.batchNo} (${item.itemName}) after ${duration.toFixed(1)} minutes`,
            );
            this.abnormalTemperatureStart.delete(batch.id);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check temperature alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get batches có cảnh báo nhiệt độ
   */
  async getBatchesWithAlerts(): Promise<InventoryBatch[]> {
    const batches = await this.inventoryBatchRepository.find({
      where: { quantityOnHand: MoreThanOrEqual(1) },
      relations: ['item'],
    });

    const alertBatches: InventoryBatch[] = [];

    for (const batch of batches) {
      if (!batch.item || batch.temperature === null || batch.temperature === undefined) {
        continue;
      }

      const item = batch.item;
      const storageType = item.storageType || 'cold';
      const minTemp = item.minTemperature ?? (storageType === 'frozen' ? -18 : 2);
      const maxTemp = item.maxTemperature ?? (storageType === 'frozen' ? -15 : 8);

      const currentTemp = batch.temperature;
      if (currentTemp < minTemp || currentTemp > maxTemp) {
        alertBatches.push(batch);
      }
    }

    return alertBatches;
  }
}

