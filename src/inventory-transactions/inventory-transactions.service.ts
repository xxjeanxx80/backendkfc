import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { InventoryTransaction, TransactionType } from './entities/inventory-transaction.entity';

@Injectable()
export class InventoryTransactionsService {
  private readonly logger = new Logger(InventoryTransactionsService.name);

  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
  ) {}

  /**
   * Tạo mới inventory transaction
   * Lưu ý: Inventory transactions thường được tạo tự động từ các flow khác (Sales, GRN, etc.)
   * Method này chỉ để hỗ trợ manual creation nếu cần thiết
   */
  async create(createInventoryTransactionDto: CreateInventoryTransactionDto) {
    this.logger.log('Creating new inventory transaction');
    try {
      const transaction = this.inventoryTransactionRepository.create({
        ...createInventoryTransactionDto,
      });
      const savedTransaction = await this.inventoryTransactionRepository.save(transaction);
      this.logger.log(`Inventory transaction created successfully: ${savedTransaction.id}`);
      return await this.findOne(savedTransaction.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create inventory transaction: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả inventory transactions với filters và relations
   * @param filters - Bộ lọc theo transactionType, itemId, batchId, startDate, endDate
   * @returns Danh sách transactions với relations (batch, item, user)
   */
  async findAll(filters?: {
    transactionType?: TransactionType;
    itemId?: number;
    batchId?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryBuilder = this.inventoryTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.batch', 'batch')
      .leftJoinAndSelect('transaction.item', 'item')
      .leftJoinAndSelect('transaction.user', 'user')
      .orderBy('transaction.createdAt', 'DESC');

    if (filters?.transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :transactionType', {
        transactionType: filters.transactionType,
      });
    }

    if (filters?.itemId) {
      queryBuilder.andWhere('transaction.itemId = :itemId', {
        itemId: filters.itemId,
      });
    }

    if (filters?.batchId) {
      queryBuilder.andWhere('transaction.batchId = :batchId', {
        batchId: filters.batchId,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters?.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Lấy một transaction theo ID với relations
   * @param id - ID của transaction
   * @returns Transaction với relations (batch, item, user)
   */
  async findOne(id: number) {
    return await this.inventoryTransactionRepository.findOne({
      where: { id },
      relations: ['batch', 'item', 'user'],
    });
  }

  /**
   * Cập nhật inventory transaction
   * Lưu ý: Inventory transactions thường không nên được chỉnh sửa sau khi tạo
   * Method này chỉ để hỗ trợ nếu cần thiết
   */
  async update(
    id: number,
    updateInventoryTransactionDto: UpdateInventoryTransactionDto,
  ) {
    this.logger.log(`Updating inventory transaction ${id}`);
    try {
      const transaction = await this.inventoryTransactionRepository.findOne({
        where: { id },
      });

      if (!transaction) {
        throw new BadRequestException(`Inventory transaction with ID ${id} not found`);
      }

      Object.assign(transaction, updateInventoryTransactionDto);
      const updatedTransaction = await this.inventoryTransactionRepository.save(transaction);
      this.logger.log(`Inventory transaction ${id} updated successfully`);
      return await this.findOne(updatedTransaction.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update inventory transaction ${id}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Xóa inventory transaction
   * Lưu ý: Inventory transactions thường không nên được xóa vì là audit trail
   * Method này chỉ để hỗ trợ nếu cần thiết
   */
  async remove(id: number) {
    this.logger.log(`Removing inventory transaction ${id}`);
    try {
      const result = await this.inventoryTransactionRepository.delete(id);
      if (result.affected === 0) {
        throw new BadRequestException(`Inventory transaction with ID ${id} not found`);
      }
      this.logger.log(`Inventory transaction ${id} removed successfully`);
      return { success: true, message: `Inventory transaction ${id} removed successfully` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to remove inventory transaction ${id}: ${message}`, stack);
      throw error;
    }
  }
}
