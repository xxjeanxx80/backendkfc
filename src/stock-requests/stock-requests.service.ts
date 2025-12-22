import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, MoreThanOrEqual, In } from 'typeorm';
import {
  StockRequest,
  StockRequestStatus,
} from './entities/stock-request.entity';
import { StockRequestPriority } from './entities/stock-request.entity';
import { CreateStockRequestDto } from './dto/create-stock-request.dto';
import { SupplierItemsService } from '../supplier-items/supplier-items.service';
import { ProcurementService } from '../procurement/procurement.service';
import { Item } from '../items/entities/item.entity';
import { POStatus } from '../procurement/entities/procurement.entity';
import { CreateProcurementDto } from '../procurement/dto/create-procurement.dto';
import { ItemsService } from '../items/items.service';
import { InventoryBatch } from '../inventory-batches/entities/inventory-batch.entity';

@Injectable()
export class StockRequestsService {
  private readonly logger = new Logger(StockRequestsService.name);

  constructor(
    @InjectRepository(StockRequest)
    private readonly stockRequestRepo: Repository<StockRequest>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    private readonly supplierItemsService: SupplierItemsService,
    private readonly procurementService: ProcurementService,
    private readonly itemsService: ItemsService,
  ) {}

  async findAll(
    status?: StockRequestStatus,
    storeId?: number,
  ): Promise<StockRequest[]> {
    try {
      const where: FindOptionsWhere<StockRequest> = {};
      if (status) where.status = status;
      if (storeId) where.storeId = storeId;
      return await this.stockRequestRepo.find({ 
        where,
        relations: ['item', 'store'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch stock requests: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch stock requests', {
        cause: error,
      });
    }
  }

  async create(dto: CreateStockRequestDto) {
    if (!dto.storeId || !dto.itemId || !dto.requestedQty) {
      throw new BadRequestException(
        'storeId, itemId, requestedQty are required',
      );
    }
    const entity = this.stockRequestRepo.create({
      storeId: dto.storeId,
      itemId: dto.itemId,
      requestedQty: dto.requestedQty,
      priority: dto.priority ?? StockRequestPriority.MEDIUM,
      requestedBy: dto.requestedBy ?? null,
      notes: dto.notes ?? null,
      status: StockRequestStatus.REQUESTED,
    });
    return this.stockRequestRepo.save(entity);
  }

  async approve(id: number, approverId: number) {
    const req = await this.stockRequestRepo.findOne({ where: { id } });
    if (!req) throw new BadRequestException('Stock request not found');
    if (
      req.status !== StockRequestStatus.REQUESTED &&
      req.status !== StockRequestStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        'Only requested/pending_approval can be approved',
      );
    }
    req.status = StockRequestStatus.APPROVED;
    req.approvedBy = approverId;
    req.approvedAt = new Date();
    return this.stockRequestRepo.save(req);
  }

  async update(id: number, data: { poId?: number; status?: StockRequestStatus }) {
    const req = await this.stockRequestRepo.findOne({ where: { id } });
    if (!req) throw new BadRequestException('Stock request not found');
    
    if (data.poId !== undefined) {
      req.poId = data.poId;
    }
    if (data.status !== undefined) {
      req.status = data.status;
    }
    
    return this.stockRequestRepo.save(req);
  }

  /**
   * Cancel one or multiple stock requests
   */
  async cancelRequests(requestIds: number[]) {
    if (!requestIds || requestIds.length === 0) {
      throw new BadRequestException('Request IDs are required');
    }

    const requests = await this.stockRequestRepo.find({
      where: requestIds.map(id => ({ id })),
    });

    if (requests.length === 0) {
      throw new BadRequestException('No stock requests found');
    }

    const cancelledRequests: StockRequest[] = [];
    for (const req of requests) {
      if (req.status === StockRequestStatus.REQUESTED) {
        req.status = StockRequestStatus.CANCELLED;
        await this.stockRequestRepo.save(req);
        cancelledRequests.push(req);
      }
    }

    return {
      cancelled: cancelledRequests.length,
      requestIds: cancelledRequests.map(r => r.id),
    };
  }

  /**
   * Generate PO from selected stock request IDs
   */
  async generatePOFromRequests(requestIds: number[]) {
    try {
      if (!requestIds || requestIds.length === 0) {
        throw new BadRequestException('Request IDs are required');
      }

      const requests = await this.stockRequestRepo.find({
        where: {
          id: In(requestIds),
          status: StockRequestStatus.REQUESTED,
        },
        relations: ['item', 'store'],
      });

      if (requests.length === 0) {
        throw new BadRequestException('No valid stock requests found');
      }

      const grouped = new Map<
        string,
        {
          storeId: number;
          supplierId: number;
          items: Array<{
            itemId: number;
            qty: number;
            unitPrice: number;
            unit: string;
            requestId: number;
          }>;
        }
      >();

      const skippedRequests: number[] = [];
      for (const req of requests) {
        const mapping = await this.supplierItemsService.findBestMappingForItem(
          req.itemId,
          new Date(),
        );
        if (!mapping) {
          this.logger.warn(
            `No supplier mapping for item ${req.itemId} (request ${req.id}), skipping`,
          );
          skippedRequests.push(req.id);
          continue;
        }
        const item = await this.itemRepo.findOne({ where: { id: req.itemId } });
        if (!item) {
          this.logger.warn(`Item ${req.itemId} not found (request ${req.id}), skipping`);
          skippedRequests.push(req.id);
          continue;
        }
        const moq = mapping.minOrderQty ?? 1;
        const roundedQty =
          req.requestedQty <= moq
            ? moq
            : Math.ceil(req.requestedQty / moq) * moq;
        const key = `${req.storeId}:${mapping.supplierId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            storeId: req.storeId,
            supplierId: mapping.supplierId,
            items: [],
          });
        }
        grouped.get(key)!.items.push({
          itemId: req.itemId,
          qty: roundedQty,
          unitPrice: Number(mapping.unitPrice),
          unit: item.unit,
          requestId: req.id,
        });
      }

      if (grouped.size === 0) {
        const errorMsg = skippedRequests.length > 0
          ? `Không thể tạo PO: ${skippedRequests.length} request(s) không có supplier mapping hoặc item không tồn tại. Request IDs: ${skippedRequests.join(', ')}`
          : 'Không thể tạo PO: Tất cả các requests đã chọn không có supplier mapping hoặc item không tồn tại.';
        throw new BadRequestException(errorMsg);
      }

      const results: Array<{ poId: number; requestIds: number[] }> = [];
      for (const [key, group] of grouped) {
        const now = new Date();
        const poNumber = `PO-${now.getTime()}-${group.storeId}-${group.supplierId}`;
        const orderItems = group.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.qty,
          unitPrice: i.unitPrice,
          unit: i.unit,
        }));
        const totalAmount = orderItems.reduce(
          (sum, i) => sum + i.quantity * i.unitPrice,
          0,
        );
        const expectedDeliveryDate = new Date(now);
        expectedDeliveryDate.setDate(now.getDate() + 5);

        const poDto: CreateProcurementDto = {
          poNumber,
          supplierId: group.supplierId,
          storeId: group.storeId,
          orderDate: now.toISOString(),
          expectedDeliveryDate: expectedDeliveryDate.toISOString(),
          orderItems,
          totalAmount,
          status: POStatus.PENDING_APPROVAL,
          notes: `Generated from ${group.items.length} stock request(s)`,
        };
        const po = await this.procurementService.create(poDto);

        const requestIdsForPO: number[] = [];
        for (const item of group.items) {
          const req = requests.find(r => r.id === item.requestId);
          if (req && req.status === StockRequestStatus.REQUESTED) {
            req.poId = po.id;
            req.status = StockRequestStatus.PO_GENERATED;
            await this.stockRequestRepo.save(req);
            requestIdsForPO.push(req.id);
          }
        }

        results.push({ poId: po.id, requestIds: requestIdsForPO });
      }

      if (results.length === 0) {
        throw new BadRequestException('Không thể tạo PO: Không có request nào hợp lệ để tạo PO.');
      }

      return results;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate PO from requests: ${message}`, stack);
      throw new InternalServerErrorException('Failed to generate PO from requests', {
        cause: error,
      });
    }
  }

  async autoGeneratePO(storeId?: number) {
    try {
      const where: FindOptionsWhere<StockRequest> = {
        status: StockRequestStatus.REQUESTED,
      };
      if (storeId) where.storeId = storeId;
      const requests = await this.stockRequestRepo.find({ where });
      if (requests.length === 0) return [];

      const grouped = new Map<
        string,
        {
          storeId: number;
          supplierId: number;
          items: Array<{
            itemId: number;
            qty: number;
            unitPrice: number;
            unit: string;
          }>;
        }
      >();
      for (const req of requests) {
        const mapping = await this.supplierItemsService.findBestMappingForItem(
          req.itemId,
          new Date(),
        );
        if (!mapping) {
          this.logger.warn(
            `No supplier mapping for item ${req.itemId}, skipping`,
          );
          // Skip or mark rejected
          req.status = StockRequestStatus.REJECTED;
          await this.stockRequestRepo.save(req);
          continue;
        }
        const item = await this.itemRepo.findOne({ where: { id: req.itemId } });
        if (!item) {
          this.logger.warn(`Item ${req.itemId} not found, skipping`);
          req.status = StockRequestStatus.REJECTED;
          await this.stockRequestRepo.save(req);
          continue;
        }
        const moq = mapping.minOrderQty ?? 1;
        const roundedQty =
          req.requestedQty <= moq
            ? moq
            : Math.ceil(req.requestedQty / moq) * moq;
        const key = `${req.storeId}:${mapping.supplierId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            storeId: req.storeId,
            supplierId: mapping.supplierId,
            items: [],
          });
        }
        grouped.get(key)!.items.push({
          itemId: req.itemId,
          qty: roundedQty,
          unitPrice: Number(mapping.unitPrice),
          unit: item.unit,
        });
      }

      const results: Array<{ poId: number; requestIds: number[] }> = [];
      for (const [key, group] of grouped) {
        // Build PO data
        const now = new Date();
        const poNumber = `AUTOPO-${now.getTime()}-${group.storeId}-${group.supplierId}`;
        const orderItems = group.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.qty,
          unitPrice: i.unitPrice,
          unit: i.unit,
        }));
        const totalAmount = orderItems.reduce(
          (sum, i) => sum + i.quantity * i.unitPrice,
          0,
        );
        const expectedDeliveryDate = new Date(now);
        expectedDeliveryDate.setDate(now.getDate() + 5);

        const poDto: CreateProcurementDto = {
          poNumber,
          supplierId: group.supplierId,
          storeId: group.storeId,
          orderDate: now.toISOString(),
          expectedDeliveryDate: expectedDeliveryDate.toISOString(),
          orderItems,
          totalAmount,
          status: POStatus.PENDING_APPROVAL,
          notes: 'Auto-generated from approved stock requests',
        };
        const po = await this.procurementService.create(poDto);

        // Update stock requests linked to this group
        const [storeIdStr] = key.split(':');
        const storeIdKey = Number(storeIdStr);
        const requestIds: number[] = [];
        for (const req of requests) {
          const mapping =
            await this.supplierItemsService.findBestMappingForItem(
              req.itemId,
              now,
            );
          if (
            mapping &&
            req.storeId === storeIdKey &&
            mapping.supplierId === group.supplierId &&
            req.status === StockRequestStatus.REQUESTED
          ) {
            req.poId = po.id;
            req.status = StockRequestStatus.PO_GENERATED;
            await this.stockRequestRepo.save(req);
            requestIds.push(req.id);
          }
        }

        results.push({ poId: po.id, requestIds });
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to auto generate PO: ${message}`, stack);
      throw new InternalServerErrorException('Failed to auto generate PO', {
        cause: error,
      });
    }
  }

  /**
   * Automatically create stock requests and POs for items below safety stock
   */
  async autoReplenishBelowSafetyStock(storeId?: number): Promise<Array<{ itemId: number; stockRequestId?: number; poId?: number }>> {
    this.logger.log('Starting auto replenishment for items below safety stock');
    
    try {
      const items = await this.itemRepo.find({ where: { isActive: true } });
      const results: Array<{ itemId: number; stockRequestId?: number; poId?: number }> = [];

      for (const item of items) {
        try {
          // Calculate safety stock
          const safetyStock = await this.itemsService.calculateSafetyStock(item.id, storeId);
          
          // Get current stock
          const currentStock = await this.itemsService.getCurrentStock(item.id, storeId);

          // Check if below safety stock
          if (currentStock < safetyStock) {
            const reorderQty = Math.max(safetyStock - currentStock, item.minStockLevel || 10);
            
            this.logger.log(
              `Item ${item.id} (${item.itemName}) below safety stock. Current: ${currentStock}, Safety: ${safetyStock}, Reorder: ${reorderQty}`
            );

            // Check if there's already a pending stock request for this item
            const existingRequest = await this.stockRequestRepo.findOne({
              where: {
                itemId: item.id,
                storeId: storeId || undefined,
                status: StockRequestStatus.REQUESTED,
              },
            });

            if (!existingRequest) {
              // Create stock request
              const stockRequest = this.stockRequestRepo.create({
                storeId: storeId || 1, // Default to store 1 if not specified
                itemId: item.id,
                requestedQty: reorderQty,
                priority: StockRequestPriority.HIGH,
                status: StockRequestStatus.REQUESTED,
                notes: `Auto-generated: Below safety stock (Current: ${currentStock}, Safety: ${safetyStock})`,
              });
              const savedRequest = await this.stockRequestRepo.save(stockRequest);
              
              // Generate PO directly from REQUESTED status (theo FLOW.md không cần approve Stock Request)
              const poResults = await this.autoGeneratePO(storeId);
              const poResult = poResults.find(r => 
                savedRequest.poId === r.poId || 
                r.requestIds.includes(savedRequest.id)
              );

              results.push({
                itemId: item.id,
                stockRequestId: savedRequest.id,
                poId: poResult?.poId,
              });
            } else {
              results.push({
                itemId: item.id,
                stockRequestId: existingRequest.id,
                poId: existingRequest.poId || undefined,
              });
            }
          }
        } catch (error) {
          this.logger.error(`Failed to process item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`Auto replenishment completed. Processed ${results.length} items`);
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to auto replenish: ${message}`, stack);
      throw new InternalServerErrorException('Failed to auto replenish', {
        cause: error,
      });
    }
  }
}
