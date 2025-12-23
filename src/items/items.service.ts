import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';
import { SalesTransaction } from '../sales/entities/sales-transaction.entity';
import { StockRequestsService } from '../stock-requests/stock-requests.service';
import { StockRequestPriority, StockRequestStatus } from '../stock-requests/entities/stock-request.entity';

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
    @Inject(forwardRef(() => StockRequestsService))
    private readonly stockRequestsService: StockRequestsService,
  ) {}

  create(createItemDto: CreateItemDto) {
    // Set giá trị mặc định cho nhiệt độ nếu chưa có
    const itemData = {
      ...createItemDto,
      storageType: createItemDto.storageType || 'cold',
      minTemperature: createItemDto.minTemperature ?? (createItemDto.storageType === 'frozen' ? -18 : 2),
      maxTemperature: createItemDto.maxTemperature ?? (createItemDto.storageType === 'frozen' ? -15 : 8),
    };
    return this.itemRepository.save(itemData);
  }

  findAll() {
    return this.itemRepository.find();
  }

  findOne(id: number) {
    return this.itemRepository.findOneBy({ id });
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    const result = await this.itemRepository.update(id, updateItemDto);
    
    // Nếu có cài safetyStock, check và tạo Stock Request nếu stock hiện tại < safetyStock
    if (updateItemDto.safetyStock !== undefined && updateItemDto.safetyStock !== null) {
      try {
        const item = await this.itemRepository.findOne({ where: { id } });
        if (item) {
          const safetyStock = Number(updateItemDto.safetyStock);
          if (safetyStock > 0) {
            // Get current stock (default storeId = 1)
            const currentStock = await this.getCurrentStock(id, 1);
            
            if (currentStock < safetyStock) {
              this.logger.log(
                `Item ${id} has safetyStock ${safetyStock} set, but current stock ${currentStock} is below. Creating stock request...`
              );
              
              // Check if there's already a pending stock request
              const existingRequests = await this.stockRequestsService.findAll(StockRequestStatus.REQUESTED, 1);
              const existingRequest = existingRequests.find(r => r.itemId === id);
              
              if (!existingRequest) {
                // Create stock request automatically
                const requestedQty = safetyStock + 20; // Hardcoded +20
                await this.stockRequestsService.create({
                  storeId: 1,
                  itemId: id,
                  requestedQty: requestedQty,
                  priority: StockRequestPriority.MEDIUM,
                  notes: `Auto-generated: Safety stock set to ${safetyStock}, current stock: ${currentStock}`,
                });
                this.logger.log(`Auto-created stock request for item ${id} (safetyStock: ${safetyStock}, current: ${currentStock})`);
              } else {
                this.logger.log(`Stock request already exists for item ${id}, skipping auto-create`);
              }
            }
          }
        }
      } catch (error) {
        // Log error but don't fail the update
        this.logger.error(`Failed to auto-create stock request after setting safetyStock: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return result;
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

      // Get lead time (default to 3 days)
      const leadTimeDays = 3;

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
