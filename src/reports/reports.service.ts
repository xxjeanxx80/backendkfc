import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { PurchaseOrder, POStatus } from '../procurement/entities/procurement.entity';
import { SalesTransaction } from '../sales/entities/sales-transaction.entity';
import { Item } from '../items/entities/item.entity';
import { ItemsService } from '../items/items.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(SalesTransaction)
    private readonly salesTransactionRepository: Repository<SalesTransaction>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    private readonly itemsService: ItemsService,
  ) {}

  async getDashboard() {
    this.logger.log('Generating dashboard data');
    try {
      // Total inventory value - using real unitCost
      const batches = await this.inventoryBatchRepository.find({
        relations: ['item'],
      });
      const totalInventoryValue = batches.reduce((sum, batch) => {
        const unitCost = Number(batch.unitCost || 0);
        // Only count batches with valid cost data
        if (unitCost > 0) {
          return sum + batch.quantityOnHand * unitCost;
        }
        return sum;
      }, 0);

      // Low stock items count
      const lowStockCount = batches.filter(
        (b) => b.status === BatchStatus.LOW_STOCK || b.status === BatchStatus.OUT_OF_STOCK,
      ).length;

      // Pending PO approvals
      const pendingApprovals = await this.purchaseOrderRepository.count({
        where: { status: POStatus.PENDING_APPROVAL },
      });

      // Stock-out risk (items with 0 or very low stock)
      const stockOutRisk = batches.filter(
        (b) => b.quantityOnHand === 0 || b.status === BatchStatus.OUT_OF_STOCK,
      ).length;

      // Gross Profit (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSales = await this.salesTransactionRepository.find({
        where: {
          saleDate: MoreThanOrEqual(thirtyDaysAgo),
        },
      });
      const totalRevenue = recentSales.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0);
      const totalCost = recentSales.reduce((sum, t) => sum + Number(t.totalCost || 0), 0);
      const grossProfit = totalRevenue - totalCost;
      const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Items below safety stock
      const items = await this.itemRepository.find({ where: { isActive: true } });
      const itemsBelowSafetyStock: Array<{
        itemId: number;
        itemName: string;
        sku: string;
        currentStock: number;
        safetyStock: number;
        difference: number;
      }> = [];

      for (const item of items) {
        try {
          const safetyStock = await this.itemsService.calculateSafetyStock(item.id);
          const currentStock = await this.itemsService.getCurrentStock(item.id);
          
          if (currentStock < safetyStock) {
            itemsBelowSafetyStock.push({
              itemId: item.id,
              itemName: item.itemName,
              sku: item.sku,
              currentStock,
              safetyStock: Number(safetyStock),
              difference: safetyStock - currentStock,
            });
          }
        } catch (error) {
          // Skip items with errors
          this.logger.warn(`Failed to check safety stock for item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Sort by difference (most critical first)
      itemsBelowSafetyStock.sort((a, b) => b.difference - a.difference);

      return {
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
        lowStockItems: lowStockCount,
        pendingPOApprovals: pendingApprovals,
        stockOutRisk,
        grossProfit: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          grossProfit: Number(grossProfit.toFixed(2)),
          margin: Number(grossProfitMargin.toFixed(2)),
          period: '30 days',
        },
        itemsBelowSafetyStock: itemsBelowSafetyStock.slice(0, 10), // Top 10 most critical
        itemsBelowSafetyStockCount: itemsBelowSafetyStock.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate dashboard: ${message}`);
      throw error;
    }
  }

  async getInventoryReport() {
    this.logger.log('Generating inventory report');
    try {
      const batches = await this.inventoryBatchRepository.find({
        relations: ['item', 'store'],
        order: { createdAt: 'DESC' },
      });

      const summary = {
        totalItems: batches.length,
        inStock: batches.filter((b) => b.status === BatchStatus.IN_STOCK).length,
        lowStock: batches.filter((b) => b.status === BatchStatus.LOW_STOCK).length,
        outOfStock: batches.filter((b) => b.status === BatchStatus.OUT_OF_STOCK).length,
        expired: batches.filter((b) => b.status === BatchStatus.EXPIRED).length,
        batches,
      };

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate inventory report: ${message}`);
      throw error;
    }
  }

  async getProcurementReport() {
    this.logger.log('Generating procurement report');
    try {
      const orders = await this.purchaseOrderRepository.find({
        relations: ['supplier', 'store', 'items'],
        order: { createdAt: 'DESC' },
      });

      const summary = {
        totalOrders: orders.length,
        pendingApproval: orders.filter((o) => o.status === POStatus.PENDING_APPROVAL).length,
        approved: orders.filter((o) => o.status === POStatus.APPROVED).length,
        confirmed: orders.filter((o) => o.status === POStatus.CONFIRMED).length,
        delivered: orders.filter((o) => o.status === POStatus.DELIVERED).length,
        totalValue: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        orders,
      };

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate procurement report: ${message}`);
      throw error;
    }
  }

  async getSalesReport(storeId?: number) {
    this.logger.log('Generating sales report');
    try {
      const where: { storeId?: number } = {};
      if (storeId) {
        where.storeId = storeId;
      }

      const transactions = await this.salesTransactionRepository.find({
        where,
        relations: ['item', 'store'],
        order: { saleDate: 'DESC' },
      });

      const summary = {
        totalTransactions: transactions.length,
        totalRevenue: transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0),
        totalQuantity: transactions.reduce((sum, t) => sum + t.quantity, 0),
        transactions,
      };

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate sales report: ${message}`);
      throw error;
    }
  }

  async getLowStockAlerts() {
    this.logger.log('Generating low stock alerts');
    try {
      const batches = await this.inventoryBatchRepository.find({
        where: [
          { status: BatchStatus.LOW_STOCK },
          { status: BatchStatus.OUT_OF_STOCK },
        ],
        relations: ['item', 'store'],
        order: { quantityOnHand: 'ASC' },
      });

      return batches.map((batch) => ({
        itemId: batch.itemId,
        itemName: batch.item?.itemName,
        sku: batch.item?.sku,
        batchNo: batch.batchNo,
        currentStock: batch.quantityOnHand,
        minStockLevel: batch.item?.minStockLevel || 10,
        status: batch.status,
        storeId: batch.storeId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate low stock alerts: ${message}`);
      throw error;
    }
  }

  async getGrossProfitReport(storeId?: number, startDate?: Date, endDate?: Date) {
    this.logger.log('Generating gross profit report');
    try {
      const queryBuilder = this.salesTransactionRepository.createQueryBuilder('sale');
      
      if (storeId) {
        queryBuilder.andWhere('sale.storeId = :storeId', { storeId });
      }
      
      if (startDate && endDate) {
        queryBuilder.andWhere('sale.saleDate BETWEEN :startDate AND :endDate', { startDate, endDate });
      } else if (startDate) {
        queryBuilder.andWhere('sale.saleDate >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('sale.saleDate <= :endDate', { endDate });
      }

      const transactions = await queryBuilder
        .leftJoinAndSelect('sale.item', 'item')
        .leftJoinAndSelect('sale.store', 'store')
        .orderBy('sale.saleDate', 'DESC')
        .getMany();

      // Calculate totals
      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount || 0), 0);
      const totalCost = transactions.reduce((sum, t) => sum + Number(t.totalCost || 0), 0);
      const totalGrossProfit = totalRevenue - totalCost;
      const grossProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

      // Group by item
      const byItem = new Map<number, {
        itemId: number;
        itemName: string;
        sku: string;
        quantity: number;
        revenue: number;
        cost: number;
        grossProfit: number;
        margin: number;
      }>();

      for (const t of transactions) {
        const itemId = t.itemId;
        if (!byItem.has(itemId)) {
          byItem.set(itemId, {
            itemId,
            itemName: t.item?.itemName || 'Unknown',
            sku: t.item?.sku || '',
            quantity: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            margin: 0,
          });
        }
        const itemData = byItem.get(itemId)!;
        itemData.quantity += t.quantity;
        itemData.revenue += Number(t.totalAmount || 0);
        itemData.cost += Number(t.totalCost || 0);
        itemData.grossProfit = itemData.revenue - itemData.cost;
        itemData.margin = itemData.revenue > 0 ? (itemData.grossProfit / itemData.revenue) * 100 : 0;
      }

      // Group by date
      const byDate = new Map<string, {
        date: string;
        quantity: number;
        revenue: number;
        cost: number;
        grossProfit: number;
        margin: number;
      }>();

      for (const t of transactions) {
        const dateKey = t.saleDate.toISOString().split('T')[0];
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, {
            date: dateKey,
            quantity: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            margin: 0,
          });
        }
        const dateData = byDate.get(dateKey)!;
        dateData.quantity += t.quantity;
        dateData.revenue += Number(t.totalAmount || 0);
        dateData.cost += Number(t.totalCost || 0);
        dateData.grossProfit = dateData.revenue - dateData.cost;
        dateData.margin = dateData.revenue > 0 ? (dateData.grossProfit / dateData.revenue) * 100 : 0;
      }

      return {
        summary: {
          totalTransactions: transactions.length,
          totalRevenue,
          totalCost,
          totalGrossProfit,
          grossProfitMargin: Number(grossProfitMargin.toFixed(2)),
        },
        byItem: Array.from(byItem.values()).sort((a, b) => b.grossProfit - a.grossProfit),
        byDate: Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date)),
        transactions: transactions.slice(0, 100), // Limit to 100 most recent
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate gross profit report: ${message}`);
      throw error;
    }
  }

  /**
   * Lấy báo cáo các items đã hết hạn hoặc sắp hết hạn
   * @param daysThreshold - Số ngày trước khi hết hạn để cảnh báo (mặc định 7 ngày)
   * @returns Danh sách items với thông tin expiry và số ngày còn lại
   */
  async getExpiredItemsReport(daysThreshold: number = 7): Promise<Array<{
    itemId: number;
    itemName: string;
    sku: string;
    batchNo: string;
    expiryDate: Date;
    daysUntilExpiry: number;
    quantityOnHand: number;
    status: string;
  }>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thresholdDate = new Date(today);
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const batches = await this.inventoryBatchRepository.find({
        where: {
          expiryDate: LessThanOrEqual(thresholdDate),
        },
        relations: ['item'],
        order: {
          expiryDate: 'ASC',
        },
      });

      return batches.map((batch) => {
        const expiryDate = new Date(batch.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status = 'near_expiry';
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry === 0) {
          status = 'expires_today';
        }

        return {
          itemId: batch.itemId,
          itemName: batch.item?.itemName || 'N/A',
          sku: batch.item?.sku || 'N/A',
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          quantityOnHand: batch.quantityOnHand,
          status,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate expired items report: ${message}`);
      throw error;
    }
  }
}

