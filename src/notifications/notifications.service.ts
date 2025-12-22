import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder, POStatus } from '../procurement/entities/procurement.entity';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { StockRequest, StockRequestStatus } from '../stock-requests/entities/stock-request.entity';

export interface Notification {
  id: string;
  type: 'po_approval' | 'low_stock' | 'stock_request' | 'out_of_stock' | 'expiry_warning' | 'below_safety_stock';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  link?: string;
  createdAt: Date;
  count?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(StockRequest)
    private readonly stockRequestRepository: Repository<StockRequest>,
  ) {}

  async getNotifications(user: { userId: number; role: string; storeId?: number }): Promise<Notification[]> {
    this.logger.log(`Fetching notifications for user ${user.userId} with role ${user.role}`);
    
    const notifications: Notification[] = [];

    try {
      // 1. Pending PO Approvals (for STORE_MANAGER and ADMIN)
      if (user.role === 'STORE_MANAGER' || user.role === 'ADMIN') {
        const pendingPOs = await this.purchaseOrderRepository.count({
          where: { status: POStatus.PENDING_APPROVAL },
        });

        if (pendingPOs > 0) {
          notifications.push({
            id: 'po_approvals',
            type: 'po_approval',
            title: 'Purchase Orders Pending Approval',
            message: `${pendingPOs} purchase order${pendingPOs > 1 ? 's' : ''} waiting for your approval`,
            priority: 'high',
            link: '/procurement?status=pending_approval',
            createdAt: new Date(),
            count: pendingPOs,
          });
        }
      }

      // 2. Low Stock Alerts (for all roles with store access)
      const lowStockBatches = await this.inventoryBatchRepository.find({
        where: [
          { status: BatchStatus.LOW_STOCK },
          { status: BatchStatus.OUT_OF_STOCK },
        ],
        relations: ['item', 'store'],
        order: { quantityOnHand: 'ASC' },
        take: 10, // Limit to 10 most critical
      });

      if (lowStockBatches.length > 0) {
        const outOfStock = lowStockBatches.filter(b => b.status === BatchStatus.OUT_OF_STOCK).length;
        const lowStock = lowStockBatches.filter(b => b.status === BatchStatus.LOW_STOCK).length;

        if (outOfStock > 0) {
          notifications.push({
            id: 'out_of_stock',
            type: 'out_of_stock',
            title: 'Out of Stock Items',
            message: `${outOfStock} item${outOfStock > 1 ? 's' : ''} out of stock`,
            priority: 'high',
            link: '/inventory?status=out_of_stock',
            createdAt: new Date(),
            count: outOfStock,
          });
        }

        if (lowStock > 0) {
          notifications.push({
            id: 'low_stock',
            type: 'low_stock',
            title: 'Low Stock Alerts',
            message: `${lowStock} item${lowStock > 1 ? 's' : ''} running low on stock`,
            priority: 'medium',
            link: '/inventory?status=low_stock',
            createdAt: new Date(),
            count: lowStock,
          });
        }
      }

      // 3. Pending Stock Requests (for PROCUREMENT_STAFF and ADMIN)
      if (user.role === 'PROCUREMENT_STAFF' || user.role === 'ADMIN') {
        const pendingRequests = await this.stockRequestRepository.count({
          where: [
            { status: StockRequestStatus.REQUESTED },
            { status: StockRequestStatus.PENDING_APPROVAL },
          ],
        });

        if (pendingRequests > 0) {
          notifications.push({
            id: 'stock_requests',
            type: 'stock_request',
            title: 'Pending Stock Requests',
            message: `${pendingRequests} stock request${pendingRequests > 1 ? 's' : ''} waiting for approval`,
            priority: 'medium',
            link: '/stock-requests?status=pending_approval',
            createdAt: new Date(),
            count: pendingRequests,
          });
        }
      }

      // 4. Expiry Warning - Items approaching 80% of shelf life
      const allBatches = await this.inventoryBatchRepository.find({
        where: { status: BatchStatus.IN_STOCK },
        relations: ['item'],
      });

      const now = new Date();
      const expiryWarnings = allBatches.filter((batch) => {
        if (!batch.expiryDate || !batch.item || batch.quantityOnHand <= 0) return false;
        try {
          const expiryDate = new Date(batch.expiryDate);
          const createdAt = new Date(batch.createdAt);
          const totalShelfLife = expiryDate.getTime() - createdAt.getTime();
          if (totalShelfLife <= 0) return false;
          const elapsed = now.getTime() - createdAt.getTime();
          const percentageUsed = (elapsed / totalShelfLife) * 100;
          return percentageUsed >= 80 && percentageUsed < 100;
        } catch {
          return false;
        }
      });

      if (expiryWarnings.length > 0) {
        notifications.push({
          id: 'expiry_warning',
          type: 'expiry_warning',
          title: 'Items Approaching Expiry',
          message: `${expiryWarnings.length} batch${expiryWarnings.length > 1 ? 'es' : ''} approaching 80% of shelf life`,
          priority: 'high',
          link: '/inventory?filter=expiry_warning',
          createdAt: new Date(),
          count: expiryWarnings.length,
        });
      }

      // Sort by priority and date
      notifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return notifications;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }
}

