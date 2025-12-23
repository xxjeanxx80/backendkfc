import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { TemperatureLog } from './entities/temperature-log.entity';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class TemperatureSimulatorService {
  private readonly logger = new Logger(TemperatureSimulatorService.name);
  
  // Track batches đã được set manually để không override trong 1 phút
  private manualOverrides = new Map<number, Date>();

  constructor(
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(TemperatureLog)
    private readonly temperatureLogRepository: Repository<TemperatureLog>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  /**
   * Simulate việc đọc nhiệt độ từ cảm biến IoT
   * Chạy mỗi 30 giây
   */
  @Cron('*/30 * * * * *')
  async simulateTemperatureReadings() {
    try {
      // Lấy tất cả batches đang có hàng
      const batches = await this.inventoryBatchRepository.find({
        where: { quantityOnHand: MoreThanOrEqual(1) },
        relations: ['item'],
      });

      this.logger.log(`Simulating temperature for ${batches.length} batches`);

      for (const batch of batches) {
        // Skip nếu batch đã được set manually trong 1 phút gần đây
        const manualOverrideTime = this.manualOverrides.get(batch.id);
        if (manualOverrideTime) {
          const minutesSinceOverride = (Date.now() - manualOverrideTime.getTime()) / 1000 / 60;
          if (minutesSinceOverride < 1) {
            continue; // Skip batch này trong 1 phút đầu
          } else {
            // Xóa khỏi manual overrides sau 1 phút
            this.manualOverrides.delete(batch.id);
          }
        }

        if (!batch.item) {
          continue;
        }

        const item = batch.item;
        const storageType = item.storageType || 'cold';
        const minTemp = item.minTemperature ?? (storageType === 'frozen' ? -18 : 2);
        const maxTemp = item.maxTemperature ?? (storageType === 'frozen' ? -15 : 8);

        // Random nhiệt độ trong ngưỡng ± 1-2°C để có dao động tự nhiên
        // 5% khả năng nhiệt độ ra ngoài ngưỡng để demo cảnh báo
        const random = Math.random();
        let simulatedTemp: number;

        if (random < 0.05) {
          // 5% khả năng nhiệt độ ra ngoài ngưỡng (để demo cảnh báo)
          const isTooHigh = Math.random() > 0.5;
          if (isTooHigh) {
            simulatedTemp = maxTemp + Math.random() * 5 + 1; // Vượt ngưỡng trên
          } else {
            simulatedTemp = minTemp - Math.random() * 5 - 1; // Vượt ngưỡng dưới
          }
        } else {
          // 95% khả năng nhiệt độ trong ngưỡng ± 1-2°C
          const center = (minTemp + maxTemp) / 2;
          const variation = (Math.random() - 0.5) * 4; // ±2°C
          simulatedTemp = center + variation;
          // Đảm bảo không ra ngoài ngưỡng quá nhiều
          simulatedTemp = Math.max(minTemp - 2, Math.min(maxTemp + 2, simulatedTemp));
        }

        // Làm tròn đến 1 chữ số thập phân
        simulatedTemp = Math.round(simulatedTemp * 10) / 10;

        // Kiểm tra xem có phải cảnh báo không
        const isAlert = simulatedTemp < minTemp || simulatedTemp > maxTemp;

        // Cập nhật nhiệt độ vào batch
        batch.temperature = simulatedTemp;
        await this.inventoryBatchRepository.save(batch);

        // Lưu vào temperature_logs
        const log = this.temperatureLogRepository.create({
          batchId: batch.id,
          temperature: simulatedTemp,
          recordedAt: new Date(),
          isAlert,
        });
        await this.temperatureLogRepository.save(log);

        if (isAlert) {
          this.logger.warn(
            `Temperature alert for batch ${batch.batchNo} (${batch.item.itemName}): ${simulatedTemp}°C (range: ${minTemp}-${maxTemp}°C)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to simulate temperature readings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Đánh dấu batch đã được set manually
   */
  markManualOverride(batchId: number) {
    this.manualOverrides.set(batchId, new Date());
    this.logger.log(`Batch ${batchId} marked as manual override`);
  }
}

