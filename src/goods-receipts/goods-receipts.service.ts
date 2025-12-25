import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import {
  GoodsReceipt,
  GoodsReceiptItem,
} from './entities/goods-receipt.entity';
import { PurchaseOrder, POStatus } from '../procurement/entities/procurement.entity';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { InventoryTransaction, TransactionType, ReferenceType } from '../inventory-transactions/entities/inventory-transaction.entity';

@Injectable()
export class GoodsReceiptsService {
  private readonly logger = new Logger(GoodsReceiptsService.name);

  constructor(
    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,
    @InjectRepository(GoodsReceiptItem)
    private readonly goodsReceiptItemRepository: Repository<GoodsReceiptItem>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
  ) {}

  async create(createGoodsReceiptDto: CreateGoodsReceiptDto, userId: number) {
    this.logger.log(`Creating goods receipt for PO: ${createGoodsReceiptDto.poId}`);

    try {
      // Validate PO exists and is in correct status
      const po = await this.purchaseOrderRepository.findOne({
        where: { id: createGoodsReceiptDto.poId },
        relations: ['items', 'items.item', 'store'],
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      // Allow creating GRN for PO in SENT or CONFIRMED status
      // SENT: PO has been sent to supplier but not yet received
      // CONFIRMED: PO has been received by inventory staff, ready to create GRN
      if (po.status !== POStatus.SENT && po.status !== POStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot create goods receipt. PO status must be SENT or CONFIRMED, current status: ${po.status}`,
        );
      }

      // Generate GRN number
      const grnNumber = `GRN-${Date.now()}-${po.poNumber}`;

      // Create goods receipt
      const goodsReceipt = this.goodsReceiptRepository.create({
        grnNumber,
        poId: createGoodsReceiptDto.poId,
        receivedDate: new Date(createGoodsReceiptDto.receivedDate),
        receivedBy: createGoodsReceiptDto.receivedBy,
      });

      const savedReceipt = await this.goodsReceiptRepository.save(goodsReceipt);

      // Process each item
      const receiptItems: GoodsReceiptItem[] = [];
      const transactions: InventoryTransaction[] = [];

      for (const itemDto of createGoodsReceiptDto.items) {
        // Find corresponding PO item
        const poItem = po.items.find((i) => i.itemId === itemDto.itemId);
        if (!poItem) {
          this.logger.warn(`Item ${itemDto.itemId} not found in PO ${po.id}`);
          continue;
        }

        // Create goods receipt item
        const receiptItem = this.goodsReceiptItemRepository.create({
          grnId: savedReceipt.id,
          itemId: itemDto.itemId,
          batchNo: itemDto.batchNo,
          expiryDate: new Date(itemDto.expiryDate),
          receivedQty: itemDto.receivedQty,
        });
        receiptItems.push(receiptItem);

        // Get unit cost from PO item
        const unitCost = Number(poItem.unitPrice);

        // Create or update inventory batch
        let batch = await this.inventoryBatchRepository.findOne({
          where: {
            batchNo: itemDto.batchNo,
            storeId: po.storeId,
            itemId: itemDto.itemId,
          },
        });

        if (batch) {
          // Update existing batch - calculate weighted average cost
          const existingValue = Number(batch.unitCost || 0) * batch.quantityOnHand;
          const newValue = unitCost * itemDto.receivedQty;
          const totalQty = batch.quantityOnHand + itemDto.receivedQty;
          batch.unitCost = totalQty > 0 ? (existingValue + newValue) / totalQty : unitCost;
          batch.quantityOnHand += itemDto.receivedQty;
          batch.expiryDate = new Date(itemDto.expiryDate);
          if (itemDto.temperature !== undefined) {
            batch.temperature = itemDto.temperature;
          }
        } else {
          // Create new batch with unit cost from PO
          batch = this.inventoryBatchRepository.create({
            itemId: itemDto.itemId,
            storeId: po.storeId,
            batchNo: itemDto.batchNo,
            expiryDate: new Date(itemDto.expiryDate),
            quantityOnHand: itemDto.receivedQty,
            unitCost: unitCost,
            temperature: itemDto.temperature,
            status: BatchStatus.IN_STOCK,
          });
        }

        // Save batch first to get ID
        const savedBatch = await this.inventoryBatchRepository.save(batch);

        // Create inventory transaction with saved batch ID
        const transaction = this.inventoryTransactionRepository.create({
          batchId: savedBatch.id,
          itemId: itemDto.itemId,
          transactionType: TransactionType.RECEIPT,
          quantity: itemDto.receivedQty,
          referenceType: ReferenceType.GRN,
          referenceId: savedReceipt.id,
          createdBy: userId,
        });
        transactions.push(transaction);
      }

      // Save all items and transactions
      await this.goodsReceiptItemRepository.save(receiptItems);
      await this.inventoryTransactionRepository.save(transactions);

      // Update PO status to DELIVERED
      po.status = POStatus.DELIVERED;
      await this.purchaseOrderRepository.save(po);

      this.logger.log(`Goods receipt created successfully: ${savedReceipt.grnNumber}`);

      return await this.goodsReceiptRepository.findOne({
        where: { id: savedReceipt.id },
        relations: ['purchaseOrder', 'items', 'items.item', 'receivedByUser'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create goods receipt: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create goods receipt', {
        cause: error,
      });
    }
  }

  async findAll() {
    this.logger.log('Fetching all goods receipts');
    try {
      const receipts = await this.goodsReceiptRepository.find({
        relations: ['purchaseOrder', 'items', 'items.item', 'receivedByUser'],
        order: { createdAt: 'DESC' },
      });
      this.logger.log(`Found ${receipts.length} goods receipts`);
      return receipts;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch goods receipts: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch goods receipts', {
        cause: error,
      });
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching goods receipt with ID: ${id}`);
    try {
      const receipt = await this.goodsReceiptRepository.findOne({
        where: { id },
        relations: ['purchaseOrder', 'items', 'items.item', 'receivedByUser'],
      });

      if (!receipt) {
        this.logger.warn(`Goods receipt with ID ${id} not found`);
        throw new BadRequestException('Goods receipt not found');
      }

      this.logger.log(`Found goods receipt: ${receipt.grnNumber}`);
      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch goods receipt ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch goods receipt', {
        cause: error,
      });
    }
  }

  async update(id: number, _updateGoodsReceiptDto: UpdateGoodsReceiptDto) {
    // Goods receipts are typically immutable, but keeping method for future use
    this.logger.log(`Update not implemented for goods receipt ${id}`);
    throw new BadRequestException('Goods receipts cannot be updated');
  }

  async remove(id: number) {
    this.logger.log(`Soft deleting goods receipt with ID: ${id}`);
    try {
      const result = await this.goodsReceiptRepository.softDelete(id);
      if (result.affected === 0) {
        this.logger.warn(`Goods receipt with ID ${id} not found for deletion`);
        throw new BadRequestException('Goods receipt not found');
      }
      this.logger.log(`Goods receipt ${id} soft-deleted successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete goods receipt ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete goods receipt', {
        cause: error,
      });
    }
  }
}
