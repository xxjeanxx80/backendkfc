import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryBatchDto } from './dto/create-inventory-batch.dto';
import { UpdateInventoryBatchDto } from './dto/update-inventory-batch.dto';
import { InventoryBatch, BatchStatus } from './entities/inventory-batch.entity';

@Injectable()
export class InventoryBatchesService {
  private readonly logger = new Logger(InventoryBatchesService.name);

  constructor(
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
  ) {}

  async create(
    createInventoryBatchDto: CreateInventoryBatchDto,
  ): Promise<InventoryBatch> {
    this.logger.log(
      `Creating new inventory batch for item: ${createInventoryBatchDto.itemId}`,
    );

    try {
      // Validate required fields
      if (!createInventoryBatchDto.itemId) {
        throw new BadRequestException('Item ID is required');
      }
      if (!createInventoryBatchDto.storeId) {
        throw new BadRequestException('Store ID is required');
      }
      if (
        !createInventoryBatchDto.batchNo ||
        createInventoryBatchDto.batchNo.trim() === ''
      ) {
        throw new BadRequestException('Batch number is required');
      }
      if (
        !createInventoryBatchDto.quantityReceived ||
        createInventoryBatchDto.quantityReceived <= 0
      ) {
        throw new BadRequestException(
          'Quantity received must be greater than 0',
        );
      }
      if (!createInventoryBatchDto.expiryDate) {
        throw new BadRequestException('Expiry date is required');
      }

      // Validate expiry date
      const expiryDate = new Date(createInventoryBatchDto.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new BadRequestException('Invalid expiry date format');
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate <= today) {
        throw new BadRequestException('Expiry date must be in the future');
      }

      // Ensure batchNo is unique per store
      const existing = await this.inventoryBatchRepository.findOne({
        where: {
          batchNo: createInventoryBatchDto.batchNo,
          storeId: createInventoryBatchDto.storeId,
        },
      });
      if (existing) {
        throw new BadRequestException('Batch number already exists');
      }

      this.logger.log(
        `Validation passed. Creating batch: ${createInventoryBatchDto.batchNo}`,
      );

      const inventoryBatchData: Partial<InventoryBatch> = {
        itemId: createInventoryBatchDto.itemId,
        storeId: createInventoryBatchDto.storeId,
        batchNo: createInventoryBatchDto.batchNo,
        quantityOnHand: createInventoryBatchDto.quantityReceived,
        expiryDate: new Date(createInventoryBatchDto.expiryDate),
        temperature: createInventoryBatchDto.temperature,
        status: createInventoryBatchDto.status ?? BatchStatus.IN_STOCK,
      };
      const inventoryBatch =
        this.inventoryBatchRepository.create(inventoryBatchData);
      const savedBatch: InventoryBatch =
        await this.inventoryBatchRepository.save(inventoryBatch);

      this.logger.log(
        `Inventory batch created successfully with ID: ${savedBatch.id}`,
      );
      return savedBatch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create inventory batch: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create inventory batch',
        { cause: error },
      );
    }
  }

  async findAll() {
    this.logger.log('Fetching all inventory batches');
    try {
      const batches = await this.inventoryBatchRepository.find({
        relations: ['item', 'store'],
      });
      this.logger.log(`Found ${batches.length} inventory batches`);
      return batches;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch inventory batches: ${message}`, stack);
      throw new InternalServerErrorException(
        'Failed to fetch inventory batches',
        { cause: error },
      );
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching inventory batch with ID: ${id}`);
    try {
      const batch = await this.inventoryBatchRepository.findOne({
        where: { id },
        relations: ['item', 'store'],
      });

      if (!batch) {
        this.logger.warn(`Inventory batch with ID ${id} not found`);
        throw new BadRequestException('Inventory batch not found');
      }

      this.logger.log(`Found inventory batch: ${batch.batchNo}`);
      return batch;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch inventory batch ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch inventory batch',
        { cause: error },
      );
    }
  }

  async update(id: number, updateInventoryBatchDto: UpdateInventoryBatchDto) {
    this.logger.log(`Updating inventory batch with ID: ${id}`);
    try {
      // Validate expiry date if provided
      if (updateInventoryBatchDto.expiryDate) {
        const expiryDate = new Date(
          updateInventoryBatchDto.expiryDate as unknown as string,
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate <= today) {
          throw new BadRequestException('Expiry date must be in the future');
        }
      }

      // Validate quantity if provided
      if (
        updateInventoryBatchDto.quantityReceived !== undefined &&
        updateInventoryBatchDto.quantityReceived <= 0
      ) {
        throw new BadRequestException(
          'Quantity received must be greater than 0',
        );
      }

      const updateData: Partial<InventoryBatch> = {};
      if (updateInventoryBatchDto.itemId !== undefined)
        updateData.itemId = updateInventoryBatchDto.itemId;
      if (updateInventoryBatchDto.storeId !== undefined)
        updateData.storeId = updateInventoryBatchDto.storeId;
      if (updateInventoryBatchDto.batchNo !== undefined)
        updateData.batchNo = updateInventoryBatchDto.batchNo;
      if (updateInventoryBatchDto.quantityReceived !== undefined)
        updateData.quantityOnHand = updateInventoryBatchDto.quantityReceived;
      if (updateInventoryBatchDto.temperature !== undefined)
        updateData.temperature = updateInventoryBatchDto.temperature;
      if (updateInventoryBatchDto.expiryDate !== undefined)
        updateData.expiryDate = new Date(
          updateInventoryBatchDto.expiryDate as unknown as string,
        );
      if (updateInventoryBatchDto.status !== undefined)
        updateData.status = updateInventoryBatchDto.status;
      const result = await this.inventoryBatchRepository.update(id, updateData);
      if (result.affected === 0) {
        this.logger.warn(`Inventory batch with ID ${id} not found for update`);
        throw new BadRequestException('Inventory batch not found');
      }
      this.logger.log(`Inventory batch ${id} updated successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update inventory batch ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to update inventory batch',
        { cause: error },
      );
    }
  }

  async remove(id: number) {
    this.logger.log(`Soft deleting inventory batch with ID: ${id}`);
    try {
      const result = await this.inventoryBatchRepository.softDelete(id);
      if (result.affected === 0) {
        this.logger.warn(
          `Inventory batch with ID ${id} not found for deletion`,
        );
        throw new BadRequestException('Inventory batch not found');
      }
      this.logger.log(`Inventory batch ${id} soft-deleted successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete inventory batch ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to delete inventory batch',
        { cause: error },
      );
    }
  }
}
