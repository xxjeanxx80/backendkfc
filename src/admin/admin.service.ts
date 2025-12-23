import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { Item } from '../items/entities/item.entity';
import { TemperatureSimulatorService } from '../temperature/temperature-simulator.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @Inject(forwardRef(() => TemperatureSimulatorService))
    private readonly temperatureSimulatorService: TemperatureSimulatorService,
  ) {}

  /**
   * Admin function để tăng/giảm inventory trực tiếp (phục vụ demo)
   * Không tạo Inventory Transaction
   */
  async adjustInventory(
    itemId: number,
    storeId: number,
    batchNo: string,
    quantityChange: number,
    expiryDate?: string,
    notes?: string,
  ): Promise<InventoryBatch> {
    this.logger.log(
      `Admin adjusting inventory: itemId=${itemId}, storeId=${storeId}, batchNo=${batchNo}, quantityChange=${quantityChange}`,
    );

    try {
      // Validate item exists
      const item = await this.itemRepository.findOne({ where: { id: itemId } });
      if (!item) {
        throw new BadRequestException(`Item with ID ${itemId} not found`);
      }

      // Validate quantityChange
      if (quantityChange === 0) {
        throw new BadRequestException('Quantity change cannot be zero');
      }

      // Find existing batch
      let batch = await this.inventoryBatchRepository.findOne({
        where: {
          itemId,
          storeId,
          batchNo,
        },
      });

      if (quantityChange > 0) {
        // Tăng inventory
        if (batch) {
          // Update existing batch
          batch.quantityOnHand += quantityChange;
          if (expiryDate) {
            batch.expiryDate = new Date(expiryDate);
          }
          // Update status based on quantity
          batch.status = this.calculateBatchStatus(batch.quantityOnHand, item.minStockLevel || 10);
        } else {
          // Create new batch
          if (!expiryDate) {
            throw new BadRequestException('Expiry date is required when creating a new batch');
          }
          batch = this.inventoryBatchRepository.create({
            itemId,
            storeId,
            batchNo,
            quantityOnHand: quantityChange,
            expiryDate: new Date(expiryDate),
            status: this.calculateBatchStatus(quantityChange, item.minStockLevel || 10),
          });
        }
      } else {
        // Giảm inventory
        if (!batch) {
          throw new BadRequestException(
            `Batch ${batchNo} not found for item ${itemId} at store ${storeId}. Cannot decrease inventory.`,
          );
        }

        const newQuantity = batch.quantityOnHand + quantityChange; // quantityChange is negative
        if (newQuantity < 0) {
          throw new BadRequestException(
            `Cannot decrease inventory. Current quantity: ${batch.quantityOnHand}, requested decrease: ${Math.abs(quantityChange)}`,
          );
        }

        batch.quantityOnHand = newQuantity;
        // Update status based on new quantity
        batch.status = this.calculateBatchStatus(newQuantity, item.minStockLevel || 10);
      }

      const savedBatch = await this.inventoryBatchRepository.save(batch);
      this.logger.log(
        `Inventory adjusted successfully. Batch ID: ${savedBatch.id}, New quantity: ${savedBatch.quantityOnHand}`,
      );

      return savedBatch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to adjust inventory: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to adjust inventory', {
        cause: error,
      });
    }
  }

  /**
   * Set nhiệt độ cho một batch cụ thể (admin function để demo)
   */
  async setTemperature(
    batchId: number,
    temperature: number,
  ): Promise<InventoryBatch> {
    this.logger.log(
      `Admin setting temperature for batch ${batchId} to ${temperature}°C`,
    );

    try {
      const batch = await this.inventoryBatchRepository.findOne({
        where: { id: batchId },
        relations: ['item'],
      });

      if (!batch) {
        throw new BadRequestException(`Batch with ID ${batchId} not found`);
      }

      // Validate temperature range (database constraint: -30 to 50)
      if (temperature < -30 || temperature > 50) {
        throw new BadRequestException('Temperature must be between -30°C and 50°C');
      }

      // Update temperature
      batch.temperature = temperature;
      const savedBatch = await this.inventoryBatchRepository.save(batch);

      // Mark as manual override để simulator không override trong 1 phút
      this.temperatureSimulatorService.markManualOverride(batchId);

      this.logger.log(
        `Temperature set successfully for batch ${batchId}: ${temperature}°C`,
      );

      return savedBatch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to set temperature: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to set temperature', {
        cause: error,
      });
    }
  }

  /**
   * Calculate batch status based on quantity and minStockLevel
   */
  private calculateBatchStatus(quantity: number, minStockLevel: number): BatchStatus {
    if (quantity === 0) {
      return BatchStatus.OUT_OF_STOCK;
    } else if (quantity < minStockLevel) {
      return BatchStatus.LOW_STOCK;
    } else {
      return BatchStatus.IN_STOCK;
    }
  }
}

