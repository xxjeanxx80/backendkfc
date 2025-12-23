import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PurchaseOrder, POStatus } from '../procurement/entities/procurement.entity';
import { InventoryBatch, BatchStatus } from '../inventory-batches/entities/inventory-batch.entity';
import { StockRequest, StockRequestStatus } from '../stock-requests/entities/stock-request.entity';
import { Item } from '../items/entities/item.entity';

export interface Notification {
  id: string;
  type: 'po_approval' | 'low_stock' | 'stock_request' | 'out_of_stock' | 'expiry_warning' | 'below_safety_stock' | 'below_min_threshold' | 'above_max_threshold' | 'auto_stock_request_created' | 'temperature_alert' | 'temperature_critical';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  link?: string;
  createdAt: Date;
  count?: number;
  itemId?: number;
  itemName?: string;
  sku?: string;
  batchId?: number;
  batchNo?: string;
  temperature?: number;
}

type ItemStatus = 'normal' | 'below_min' | 'above_max' | 'low_stock' | 'out_of_stock';

interface ItemState {
  status: ItemStatus;
  stock: number;
  lastNotified?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // Track state của items để detect thay đổi
  private itemStates = new Map<number, ItemState>();
  
  // Track các Stock Requests đã được notify
  private notifiedStockRequests = new Set<number>();
  
  // Flag để đánh dấu lần đầu tiên check (sau khi restart)
  private isFirstCheck = true;

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
    @InjectRepository(StockRequest)
    private readonly stockRequestRepository: Repository<StockRequest>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {
    // Reset state khi service được khởi tạo (backend restart)
    this.itemStates.clear();
    this.notifiedStockRequests.clear();
    this.isFirstCheck = true;
    this.logger.log('NotificationsService initialized - state tracking reset');
  }

  async getNotifications(user: { userId: number; role: string; storeId?: number }): Promise<Notification[]> {
    this.logger.log(`Fetching notifications for user ${user.userId} with role ${user.role}, storeId: ${user.storeId || 'N/A'}`);
    
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

      // 2. Stock Alert Notifications - Detect thay đổi trạng thái items (grouped by SKU, based on total stock)
      // Logic này đã được xử lý trong detectStockAlertChanges() - không cần check batch status nữa

      // 3. Pending Stock Requests (for PROCUREMENT_STAFF and ADMIN)
      if (user.role === 'PROCUREMENT_STAFF' || user.role === 'ADMIN') {
        const pendingRequests = await this.stockRequestRepository.count({
          where: [
            { status: StockRequestStatus.REQUESTED },
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

      // 4. Stock Alert Notifications - Detect thay đổi trạng thái items (for all roles)
      const stockAlertNotifications = await this.detectStockAlertChanges(user.storeId);
      this.logger.log(`Stock alert notifications found: ${stockAlertNotifications.length}`);
      notifications.push(...stockAlertNotifications);

      // 5. Auto Stock Request Created Notifications (for all roles)
      const autoRequestNotifications = await this.detectAutoStockRequests();
      this.logger.log(`Auto stock request notifications found: ${autoRequestNotifications.length}`);
      notifications.push(...autoRequestNotifications);

      // 6. Expiry Warning - Items approaching 80% of shelf life
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

      this.logger.log(`Total notifications returned for user ${user.userId} (${user.role}): ${notifications.length}`);
      return notifications;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Detect thay đổi trạng thái items và tạo notifications
   * Group batches by SKU và tính tổng stock để xác định status (không dựa vào status của từng batch)
   */
  private async detectStockAlertChanges(storeId?: number): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
      // Fetch tất cả items active
      const items = await this.itemRepository.find({ where: { isActive: true } });
      this.logger.log(`Found ${items.length} active items`);
      
      // Fetch tất cả batches để tính toán stock
      const batchWhere = storeId ? { storeId } : {};
      const allBatches = await this.inventoryBatchRepository.find({
        where: batchWhere,
        relations: ['item'],
      });
      this.logger.log(`Found ${allBatches.length} batches${storeId ? ` for store ${storeId}` : ''}`);

      // Group batches by SKU và tính tổng stock (giống logic trong Inventory.tsx)
      const skuStockMap = new Map<string, { item: Item; totalStock: number }>();
      
      for (const batch of allBatches) {
        if (!batch.item || !batch.item.sku) continue;
        
        const sku = batch.item.sku;
        const existing = skuStockMap.get(sku);
        
        if (existing) {
          // Cộng tổng stock từ tất cả batches của cùng SKU
          existing.totalStock += batch.quantityOnHand;
        } else {
          skuStockMap.set(sku, {
            item: batch.item,
            totalStock: batch.quantityOnHand,
          });
        }
      }
      
      this.logger.log(`Grouped into ${skuStockMap.size} unique SKUs`);

      // Check từng item và detect thay đổi dựa trên tổng stock (không dựa vào status của batch)
      let itemsWithAlerts = 0;
      let itemsWithStateChange = 0;
      
      for (const item of items) {
        if (!item.sku) continue;
        
        const stockInfo = skuStockMap.get(item.sku);
        const currentStock = stockInfo?.totalStock || 0;
        
        // Xác định state dựa trên tổng stock so với minStockLevel và maxStockLevel
        // Không dựa vào status của từng batch vì có thể có batch hết nhưng tổng vẫn còn
        let currentState: ItemStatus = 'normal';
        if (currentStock === 0) {
          currentState = 'out_of_stock';
          itemsWithAlerts++;
        } else if (currentStock < item.minStockLevel) {
          currentState = 'below_min';
          itemsWithAlerts++;
        } else if (currentStock >= item.maxStockLevel) {
          currentState = 'above_max';
          itemsWithAlerts++;
        }
        // Nếu stock >= minStockLevel và < maxStockLevel thì là 'normal'

        // Get previous state
        const previousState = this.itemStates.get(item.id);
        
        // Log để debug cho items có cảnh báo
        if (currentState !== 'normal') {
          this.logger.log(`Item ${item.id} (${item.sku}): currentStock=${currentStock}, min=${item.minStockLevel}, max=${item.maxStockLevel}, currentState=${currentState}, previousState=${previousState?.status || 'none'}`);
        }
        
        // Check nếu có thay đổi trạng thái
        const hasStateChange = !previousState || previousState.status !== currentState;
        if (hasStateChange) {
          itemsWithStateChange++;
        }
        
        // Detect thay đổi và tạo notification
        // Luôn báo khi item đang ở trạng thái cảnh báo (không chỉ khi có thay đổi)
        // Để tránh spam, chỉ báo một lần cho mỗi trạng thái cảnh báo, nhưng sẽ báo lại khi:
        // 1. Lần đầu check sau restart (isFirstCheck = true)
        // 2. Chưa có previousState
        // 3. Có thay đổi trạng thái
        // 4. Đang ở trạng thái cảnh báo (luôn báo để user biết tình trạng hiện tại)
        const shouldNotify = (currentState !== 'normal') && (
          this.isFirstCheck || // Lần đầu check sau restart - báo tất cả items đang ở trạng thái cảnh báo
          !previousState || // Chưa có previousState và đang ở trạng thái cảnh báo
          previousState.status === 'normal' || // Chuyển từ normal sang cảnh báo
          previousState.status !== currentState || // Chuyển từ cảnh báo này sang cảnh báo khác
          previousState.status === currentState // Luôn báo khi đang ở trạng thái cảnh báo (để user luôn thấy tình trạng)
        );
        
        if (shouldNotify) {
          // Báo khi ở trạng thái cảnh báo
          if (currentState === 'below_min') {
            notifications.push({
              id: `below_min_${item.id}_${Date.now()}`,
              type: 'below_min_threshold',
              title: 'Stock Below Minimum Threshold',
              message: `${item.itemName} (${item.sku}) stock is ${currentStock} ${item.unit}, below minimum threshold of ${item.minStockLevel} ${item.unit}`,
              priority: 'high',
              link: `/inventory?itemId=${item.id}`,
              createdAt: new Date(),
              itemId: item.id,
              itemName: item.itemName,
              sku: item.sku,
            });
          } else if (currentState === 'above_max') {
            notifications.push({
              id: `above_max_${item.id}_${Date.now()}`,
              type: 'above_max_threshold',
              title: 'Stock Above Maximum Threshold',
              message: `${item.itemName} (${item.sku}) stock is ${currentStock} ${item.unit}, above maximum threshold of ${item.maxStockLevel} ${item.unit}`,
              priority: 'medium',
              link: `/inventory?itemId=${item.id}`,
              createdAt: new Date(),
              itemId: item.id,
              itemName: item.itemName,
              sku: item.sku,
            });
          } else if (currentState === 'out_of_stock') {
            notifications.push({
              id: `out_of_stock_${item.id}_${Date.now()}`,
              type: 'out_of_stock',
              title: 'Out of Stock',
              message: `${item.itemName} (${item.sku}) is out of stock (total stock: ${currentStock} ${item.unit})`,
              priority: 'high',
              link: `/inventory?itemId=${item.id}`,
              createdAt: new Date(),
              itemId: item.id,
              itemName: item.itemName,
              sku: item.sku,
            });
          }
          
          // Update state (bao gồm cả khi trở về normal để có thể báo lại khi thay đổi tiếp)
          this.itemStates.set(item.id, {
            status: currentState,
            stock: currentStock,
            lastNotified: new Date(),
          });
        } else {
          // Không có thay đổi trạng thái, chỉ update stock number
          if (previousState) {
            this.itemStates.set(item.id, {
              ...previousState,
              stock: currentStock,
            });
          } else {
            // Nếu chưa có previousState, tạo mới với currentState
            this.itemStates.set(item.id, {
              status: currentState,
              stock: currentStock,
            });
          }
        }
      }
      
      this.logger.log(`Stock alerts: ${itemsWithAlerts} items with alerts, ${itemsWithStateChange} items with state changes, ${notifications.length} notifications created`);
      
      // Sau lần đầu check, set flag về false
      if (this.isFirstCheck) {
        this.isFirstCheck = false;
        this.logger.log('First check completed, future checks will only notify on state changes');
      }
    } catch (error) {
      this.logger.error(`Failed to detect stock alert changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return notifications;
  }

  /**
   * Detect Stock Requests mới được tự động tạo
   */
  private async detectAutoStockRequests(): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
      // Fetch Stock Requests mới được tạo trong vòng 10 phút gần đây với notes chứa "Auto-generated"
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
      
      const autoRequests = await this.stockRequestRepository.find({
        where: {
          status: StockRequestStatus.REQUESTED,
        },
        relations: ['item', 'store'],
        order: { createdAt: 'DESC' },
      });
      
      this.logger.log(`Found ${autoRequests.length} REQUESTED stock requests`);

      // Filter các requests có notes chứa "Auto-generated" và chưa được notify
      const newAutoRequests = autoRequests.filter(req => {
        if (!req.notes || !req.notes.includes('Auto-generated')) return false;
        if (this.notifiedStockRequests.has(req.id)) {
          this.logger.log(`Stock request ${req.id} already notified, skipping`);
          return false;
        }
        const createdAt = new Date(req.createdAt);
        const isRecent = createdAt >= tenMinutesAgo;
        if (!isRecent) {
          this.logger.log(`Stock request ${req.id} created at ${createdAt} is older than 10 minutes, skipping`);
        }
        return isRecent;
      });
      
      this.logger.log(`Found ${newAutoRequests.length} new auto-generated stock requests to notify`);

      for (const request of newAutoRequests) {
        notifications.push({
          id: `auto_stock_request_${request.id}`,
          type: 'auto_stock_request_created',
          title: 'Auto Stock Request Created',
          message: `Stock request automatically created for ${request.item?.itemName || 'Item'} (${request.item?.sku || 'N/A'}) - Quantity: ${request.requestedQty} ${request.item?.unit || ''}`,
          priority: 'medium',
          link: `/stock-requests?id=${request.id}`,
          createdAt: new Date(request.createdAt),
          itemId: request.itemId,
          itemName: request.item?.itemName,
          sku: request.item?.sku,
        });
        
        // Mark as notified
        this.notifiedStockRequests.add(request.id);
      }
    } catch (error) {
      this.logger.error(`Failed to detect auto stock requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return notifications;
  }

  /**
   * Detect temperature alerts và tạo notifications
   */
  private async detectTemperatureAlerts(): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
      // Lấy tất cả batches đang có hàng và có nhiệt độ
      const batches = await this.inventoryBatchRepository.find({
        where: { quantityOnHand: MoreThanOrEqual(1) },
        relations: ['item'],
      });
      
      const alertBatches = batches.filter(batch => {
        if (!batch.item || batch.temperature === null || batch.temperature === undefined) {
          return false;
        }
        const item = batch.item;
        const storageType = item.storageType || 'cold';
        const minTemp = item.minTemperature ?? (storageType === 'frozen' ? -18 : 2);
        const maxTemp = item.maxTemperature ?? (storageType === 'frozen' ? -15 : 8);
        const currentTemp = batch.temperature;
        return currentTemp < minTemp || currentTemp > maxTemp;
      });
      
      for (const batch of alertBatches) {
        if (!batch.item) continue;
        
        const item = batch.item;
        const storageType = item.storageType || 'cold';
        const minTemp = item.minTemperature ?? (storageType === 'frozen' ? -18 : 2);
        const maxTemp = item.maxTemperature ?? (storageType === 'frozen' ? -15 : 8);
        const currentTemp = batch.temperature!;
        
        // Xác định mức độ nghiêm trọng
        const tempDiff = currentTemp < minTemp 
          ? minTemp - currentTemp 
          : currentTemp - maxTemp;
        
        const isCritical = tempDiff > 5; // Nếu chênh lệch > 5°C thì là critical
        
        const notificationType = isCritical ? 'temperature_critical' : 'temperature_alert';
        const title = isCritical 
          ? 'Critical Temperature Alert' 
          : 'Temperature Alert';
        const message = currentTemp < minTemp
          ? `${item.itemName} (${item.sku}) - Batch ${batch.batchNo}: Temperature ${currentTemp}°C is below minimum ${minTemp}°C`
          : `${item.itemName} (${item.sku}) - Batch ${batch.batchNo}: Temperature ${currentTemp}°C is above maximum ${maxTemp}°C`;
        
        notifications.push({
          id: `temperature_${batch.id}_${Date.now()}`,
          type: notificationType,
          title,
          message,
          priority: isCritical ? 'high' : 'medium',
          link: `/inventory?batchId=${batch.id}`,
          createdAt: new Date(),
          itemId: item.id,
          itemName: item.itemName,
          sku: item.sku,
          batchId: batch.id,
          batchNo: batch.batchNo,
          temperature: currentTemp,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to detect temperature alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return notifications;
  }
}

