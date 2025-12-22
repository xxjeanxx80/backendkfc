import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { SalesTransaction } from '../sales/entities/sales-transaction.entity';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(SalesTransaction)
    private readonly salesTransactionRepository: Repository<SalesTransaction>,
  ) {}

  create(createItemDto: CreateItemDto) {
    return this.itemRepository.save(createItemDto);
  }

  findAll() {
    return this.itemRepository.find();
  }

  findOne(id: number) {
    return this.itemRepository.findOneBy({ id });
  }

  update(id: number, updateItemDto: UpdateItemDto) {
    return this.itemRepository.update(id, updateItemDto);
  }

  remove(id: number) {
    return this.itemRepository.softDelete(id);
  }

  /**
   * Calculate Safety Stock for an item based on demand variability and lead time
   * Formula: Safety Stock = Z * sqrt(Lead Time) * Standard Deviation of Demand
   * Simplified: Safety Stock = Average Daily Demand * Lead Time Days * Safety Factor (1.5)
   */
  async calculateSafetyStock(itemId: number, storeId?: number): Promise<number> {
    this.logger.log(`Calculating safety stock for item ${itemId}`);
    
    try {
      const item = await this.itemRepository.findOne({ where: { id: itemId } });
      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      // If safety stock is manually set, use it
      if (item.safetyStock && item.safetyStock > 0) {
        return Number(item.safetyStock);
      }

      // Calculate average daily demand from last 30 days of sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const queryBuilder = this.salesTransactionRepository
        .createQueryBuilder('sale')
        .where('sale.itemId = :itemId', { itemId })
        .andWhere('sale.saleDate >= :thirtyDaysAgo', { thirtyDaysAgo });
      
      if (storeId) {
        queryBuilder.andWhere('sale.storeId = :storeId', { storeId });
      }

      const recentSales = await queryBuilder
        .orderBy('sale.saleDate', 'DESC')
        .getMany();

      if (recentSales.length === 0) {
        // If no sales data, use minStockLevel as fallback
        return item.minStockLevel || 10;
      }

      // Calculate total quantity sold in last 30 days
      const totalQuantity = recentSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const averageDailyDemand = totalQuantity / 30;

      // Get lead time (from item or supplier, default to 3 days)
      const leadTimeDays = item.leadTimeDays || 3;

      // Safety factor (1.5 = 50% buffer for variability)
      const safetyFactor = 1.5;

      // Calculate safety stock
      const safetyStock = Math.ceil(averageDailyDemand * leadTimeDays * safetyFactor);

      // Ensure minimum safety stock
      const minSafetyStock = item.minStockLevel || 10;
      return Math.max(safetyStock, minSafetyStock);
    } catch (error) {
      this.logger.error(`Failed to calculate safety stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
      const item = await this.itemRepository.findOne({ where: { id: itemId } });
      return item?.minStockLevel || 10;
    }
  }

  /**
   * Get current stock level for an item
   */
  async getCurrentStock(itemId: number, storeId?: number): Promise<number> {
    const where: { itemId: number; storeId?: number } = { itemId };
    if (storeId) {
      where.storeId = storeId;
    }

    const batches = await this.inventoryBatchRepository.find({ where });
    return batches.reduce((sum, batch) => sum + batch.quantityOnHand, 0);
  }
}
