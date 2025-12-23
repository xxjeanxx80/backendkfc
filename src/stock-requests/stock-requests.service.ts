import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
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
import { PurchaseOrder } from '../procurement/entities/procurement.entity';

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
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    private readonly supplierItemsService: SupplierItemsService,
    private readonly procurementService: ProcurementService,
    @Inject(forwardRef(() => ItemsService))
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

  async update(id: number, data: { poId?: number; status?: StockRequestStatus }) {
    const req = await this.stockRequestRepo.findOne({ where: { id } });
    if (!req) throw new BadRequestException('Stock request not found');
    
    if (data.poId !== undefined) {
      req.poId = data.poId;
    }
    if (data.status !== undefined) {
      // Chỉ cho phép chuyển từ REQUESTED sang CANCELLED hoặc PO_GENERATED
      if (req.status !== StockRequestStatus.REQUESTED) {
        throw new BadRequestException(
          `Cannot change status. Current status: ${req.status}. Only REQUESTED status can be changed.`,
        );
      }
      if (
        data.status !== StockRequestStatus.CANCELLED &&
        data.status !== StockRequestStatus.PO_GENERATED
      ) {
        throw new BadRequestException(
          `Invalid status transition. Only CANCELLED or PO_GENERATED are allowed from REQUESTED status.`,
        );
      }
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
        // Generate PO number theo format PO-{số thứ tự}
        const poNumber = await this.generatePONumber();
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
          // Skip or mark cancelled
          req.status = StockRequestStatus.CANCELLED;
          await this.stockRequestRepo.save(req);
          continue;
        }
        const item = await this.itemRepo.findOne({ where: { id: req.itemId } });
        if (!item) {
          this.logger.warn(`Item ${req.itemId} not found, skipping`);
          req.status = StockRequestStatus.CANCELLED;
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
        // Generate PO number theo format PO-{số thứ tự}
        const poNumber = await this.generatePONumber();
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
          // Get safety stock: use item.safetyStock if available, otherwise calculate
          let safetyStock: number;
          if (item.safetyStock && item.safetyStock > 0) {
            safetyStock = Number(item.safetyStock);
          } else {
            safetyStock = await this.itemsService.calculateSafetyStock(item.id, storeId);
          }
          
          // Get current stock
          const currentStock = await this.itemsService.getCurrentStock(item.id, storeId);

          // Check if below safety stock
          if (currentStock < safetyStock) {
            // Requested Quantity = safetyStock + 20 (hardcoded)
            const requestedQty = safetyStock + 20;
            
            this.logger.log(
              `Item ${item.id} (${item.itemName}) below safety stock. Current: ${currentStock}, Safety: ${safetyStock}, Requested: ${requestedQty}`
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
                requestedQty: requestedQty,
                priority: StockRequestPriority.MEDIUM,
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

  /**
   * Express Order: Create Stock Request with HIGH priority, auto-generate PO, auto-approve, and auto-send
   * This bypasses the normal approval workflow and goes directly to SENT status
   */
  async expressOrder(
    itemId: number,
    storeId: number,
    requestedQty: number,
    requestedBy?: number,
  ) {
    this.logger.log(`Creating express order for item ${itemId}, store ${storeId}, qty ${requestedQty}`);
    
    try {
      // 1. Create Stock Request with priority = HIGH, status = REQUESTED
      const stockRequest = this.stockRequestRepo.create({
        storeId,
        itemId,
        requestedQty,
        priority: StockRequestPriority.HIGH,
        status: StockRequestStatus.REQUESTED,
        requestedBy: requestedBy || null,
        notes: 'Express Order - Auto-approved and sent',
      });
      const savedRequest = await this.stockRequestRepo.save(stockRequest);
      this.logger.log(`Stock Request ${savedRequest.id} created for express order`);

      // 2. Auto-generate PO from this stock request
      const poResults = await this.generatePOFromRequests([savedRequest.id]);
      if (!poResults || poResults.length === 0) {
        throw new BadRequestException('Failed to generate PO from stock request');
      }
      
      const poResult = poResults[0];
      const poId = poResult.poId;
      this.logger.log(`PO ${poId} generated from stock request ${savedRequest.id}`);

      // 3. Get the PO and auto-approve it (using system user ID 0 or 1 as approver)
      const po = await this.procurementService.findOne(poId);
      if (po.status !== POStatus.PENDING_APPROVAL) {
        this.logger.warn(`PO ${poId} status is ${po.status}, expected PENDING_APPROVAL`);
      } else {
        // Auto-approve PO (using system user ID 1 as approver)
        await this.procurementService.approve(poId, 1);
        this.logger.log(`PO ${poId} auto-approved`);
      }

      // 4. Auto-send PO (status = SENT)
      const approvedPO = await this.procurementService.findOne(poId);
      if (approvedPO.status === POStatus.APPROVED) {
        await this.procurementService.send(poId);
        this.logger.log(`PO ${poId} auto-sent`);
      }

      // 5. Update Stock Request status = PO_GENERATED
      savedRequest.status = StockRequestStatus.PO_GENERATED;
      savedRequest.poId = poId;
      await this.stockRequestRepo.save(savedRequest);

      // Return the final PO with SENT status
      const finalPO = await this.procurementService.findOne(poId);
      return finalPO;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create express order: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create express order', {
        cause: error,
      });
    }
  }

  /**
   * Generate PO number theo format PO-{số thứ tự}
   * Tìm số thứ tự tiếp theo dựa vào số lượng PO hiện có
   */
  private async generatePONumber(): Promise<string> {
    try {
      // Đếm số lượng PO hiện có để tìm số thứ tự tiếp theo
      const totalCount = await this.purchaseOrderRepository.count();
      const nextNumber = totalCount + 1;
      return `PO-${nextNumber}`;
    } catch (error) {
      this.logger.error(`Failed to generate PO number: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback: dùng timestamp nếu có lỗi
      return `PO-${Date.now()}`;
    }
  }
}
