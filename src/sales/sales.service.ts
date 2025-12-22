import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSalesTransactionDto } from './dto/create-sales-transaction.dto';
import { SalesTransaction } from './entities/sales-transaction.entity';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { InventoryTransaction, TransactionType, ReferenceType } from '../inventory-transactions/entities/inventory-transaction.entity';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(SalesTransaction)
    private readonly salesTransactionRepository: Repository<SalesTransaction>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
  ) {}

  async create(createSalesTransactionDto: CreateSalesTransactionDto, userId: number) {
    this.logger.log(
      `Creating sales transaction for item: ${createSalesTransactionDto.itemId}`,
    );

    try {
      // Validate quantity
      if (createSalesTransactionDto.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      // Calculate total amount
      const totalAmount =
        createSalesTransactionDto.quantity * createSalesTransactionDto.unitPrice;

      // Create sales transaction
      const salesTransaction = this.salesTransactionRepository.create({
        storeId: createSalesTransactionDto.storeId,
        itemId: createSalesTransactionDto.itemId,
        quantity: createSalesTransactionDto.quantity,
        unitPrice: createSalesTransactionDto.unitPrice,
        totalAmount,
        saleDate: new Date(createSalesTransactionDto.saleDate),
        createdBy: userId,
        notes: createSalesTransactionDto.notes,
      });

      const savedTransaction =
        await this.salesTransactionRepository.save(salesTransaction);

      // Update inventory using FIFO (First In First Out) and calculate cost
      const costCalculation = await this.updateInventoryFIFO(
        createSalesTransactionDto.itemId,
        createSalesTransactionDto.storeId,
        createSalesTransactionDto.quantity,
        savedTransaction.id,
        userId,
      );

      // Update sales transaction with cost information
      savedTransaction.costPrice = costCalculation.averageCostPrice;
      savedTransaction.totalCost = costCalculation.totalCost;
      savedTransaction.grossProfit = totalAmount - costCalculation.totalCost;
      await this.salesTransactionRepository.save(savedTransaction);

      this.logger.log(
        `Sales transaction created successfully with ID: ${savedTransaction.id}, Gross Profit: ${savedTransaction.grossProfit}`,
      );

      return await this.salesTransactionRepository.findOne({
        where: { id: savedTransaction.id },
        relations: ['item', 'store', 'user'],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create sales transaction: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create sales transaction', {
        cause: error,
      });
    }
  }

  private async updateInventoryFIFO(
    itemId: number,
    storeId: number,
    quantity: number,
    salesTransactionId: number,
    userId: number,
  ): Promise<{ averageCostPrice: number; totalCost: number }> {
    // Get batches ordered by expiry date (FIFO)
    const batches = await this.inventoryBatchRepository.find({
      where: {
        itemId,
        storeId,
        status: BatchStatus.IN_STOCK,
      },
      order: {
        expiryDate: 'ASC',
        createdAt: 'ASC',
      },
    });

    let remainingQty = quantity;
    let totalCost = 0;
    const costDetails: Array<{ qty: number; cost: number }> = [];

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const qtyToDeduct = Math.min(remainingQty, batch.quantityOnHand);
      const batchCost = Number(batch.unitCost || 0);
      const costForThisBatch = qtyToDeduct * batchCost;
      totalCost += costForThisBatch;
      costDetails.push({ qty: qtyToDeduct, cost: batchCost });

      batch.quantityOnHand -= qtyToDeduct;
      remainingQty -= qtyToDeduct;

      // Update batch status
      if (batch.quantityOnHand === 0) {
        batch.status = BatchStatus.OUT_OF_STOCK;
      } else if (batch.quantityOnHand < 10) {
        batch.status = BatchStatus.LOW_STOCK;
      }

      await this.inventoryBatchRepository.save(batch);

      // Create inventory transaction
      // ISSUE transactions must have negative quantity to represent inventory reduction
      const transaction = this.inventoryTransactionRepository.create({
        batchId: batch.id,
        itemId,
        transactionType: TransactionType.ISSUE,
        quantity: -qtyToDeduct, // Negative quantity for ISSUE transactions
        referenceType: ReferenceType.SALES,
        referenceId: salesTransactionId,
        createdBy: userId,
      });
      await this.inventoryTransactionRepository.save(transaction);
    }

    if (remainingQty > 0) {
      this.logger.warn(
        `Insufficient inventory for item ${itemId}. Remaining quantity: ${remainingQty}`,
      );
      throw new BadRequestException(
        `Insufficient inventory. Available quantity is less than requested ${quantity}`,
      );
    }

    // Calculate average cost price
    const averageCostPrice = quantity > 0 ? totalCost / quantity : 0;

    return {
      averageCostPrice,
      totalCost,
    };
  }

  async findAll(storeId?: number) {
    this.logger.log('Fetching all sales transactions');
    try {
      const where: { storeId?: number } = {};
      if (storeId) {
        where.storeId = storeId;
      }

      const transactions = await this.salesTransactionRepository.find({
        where,
        relations: ['item', 'store', 'user'],
        order: { saleDate: 'DESC' },
      });
      this.logger.log(`Found ${transactions.length} sales transactions`);
      return transactions;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch sales transactions: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch sales transactions', {
        cause: error,
      });
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching sales transaction with ID: ${id}`);
    try {
      const transaction = await this.salesTransactionRepository.findOne({
        where: { id },
        relations: ['item', 'store', 'user'],
      });

      if (!transaction) {
        this.logger.warn(`Sales transaction with ID ${id} not found`);
        throw new BadRequestException('Sales transaction not found');
      }

      return transaction;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch sales transaction ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch sales transaction', {
        cause: error,
      });
    }
  }
}
