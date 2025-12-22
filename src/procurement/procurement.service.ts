import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  POStatus,
} from './entities/procurement.entity';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
  ) {}

  async create(createProcurementDto: CreateProcurementDto) {
    this.logger.log(
      `Creating new purchase order for supplier: ${createProcurementDto.supplierId}`,
    );

    try {
      // Validate required fields
      if (!createProcurementDto.supplierId) {
        throw new BadRequestException('Supplier ID is required');
      }
      if (!createProcurementDto.storeId) {
        throw new BadRequestException('Store ID is required');
      }
      if (
        !createProcurementDto.orderItems ||
        createProcurementDto.orderItems.length === 0
      ) {
        throw new BadRequestException('At least one order item is required');
      }

      // Validate PO number
      if (
        !createProcurementDto.poNumber ||
        createProcurementDto.poNumber.trim() === ''
      ) {
        throw new BadRequestException('PO Number is required');
      }

      // Validate dates
      const orderDate = new Date(createProcurementDto.orderDate);
      const expectedDeliveryDate = new Date(
        createProcurementDto.expectedDeliveryDate,
      );

      if (isNaN(orderDate.getTime())) {
        throw new BadRequestException('Invalid order date format');
      }

      if (isNaN(expectedDeliveryDate.getTime())) {
        throw new BadRequestException('Invalid expected delivery date format');
      }

      if (expectedDeliveryDate <= orderDate) {
        throw new BadRequestException(
          'Expected delivery date must be after order date',
        );
      }

      // Validate order items
      for (const item of createProcurementDto.orderItems) {
        const missingRequired =
          item.itemId == null ||
          item.quantity == null ||
          item.unitPrice == null;
        if (missingRequired) {
          throw new BadRequestException(
            'Each order item must have itemId, quantity, and unitPrice',
          );
        }
        if (item.quantity <= 0) {
          throw new BadRequestException('Quantity must be greater than 0');
        }
        if (item.unitPrice <= 0) {
          throw new BadRequestException('Unit price must be greater than 0');
        }
        if (!item.unit || item.unit.trim() === '') {
          throw new BadRequestException('Unit is required for each order item');
        }
      }

      // Validate total amount
      if (createProcurementDto.totalAmount <= 0) {
        throw new BadRequestException('Total amount must be greater than 0');
      }

      // Calculate expected total from items
      const calculatedTotal = createProcurementDto.orderItems.reduce(
        (total, item) => {
          return total + item.quantity * item.unitPrice;
        },
        0,
      );

      // Allow small rounding differences (within 1%)
      const difference = Math.abs(
        calculatedTotal - createProcurementDto.totalAmount,
      );
      const tolerance = calculatedTotal * 0.01;

      if (difference > tolerance) {
        throw new BadRequestException(
          `Total amount mismatch. Expected: ${calculatedTotal}, Provided: ${createProcurementDto.totalAmount}`,
        );
      }

      this.logger.log(
        `Validation passed. Creating PO with ${createProcurementDto.orderItems.length} items`,
      );

      // Create purchase order
      const purchaseOrderData: Partial<PurchaseOrder> = {
        poNumber: createProcurementDto.poNumber,
        supplierId: createProcurementDto.supplierId,
        storeId: createProcurementDto.storeId,
        orderDate: new Date(createProcurementDto.orderDate),
        expectedDeliveryDate: new Date(
          createProcurementDto.expectedDeliveryDate,
        ),
        status: createProcurementDto.status as POStatus,
        totalAmount: createProcurementDto.totalAmount,
        notes: createProcurementDto.notes,
      };

      const purchaseOrder =
        this.purchaseOrderRepository.create(purchaseOrderData);
      const savedOrder = await this.purchaseOrderRepository.save(purchaseOrder);

      // Create order items
      const orderItems = createProcurementDto.orderItems.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        return this.purchaseOrderItemRepository.create({
          poId: savedOrder.id,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: itemTotal,
          unit: item.unit,
        });
      });

      await this.purchaseOrderItemRepository.save(orderItems);

      this.logger.log(
        `Purchase order created successfully with ID: ${savedOrder.id}`,
      );
      return savedOrder;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create purchase order: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create purchase order',
        { cause: error },
      );
    }
  }

  async findAll(supplierId?: number) {
    this.logger.log(`Fetching purchase orders${supplierId ? ` for supplier ${supplierId}` : ''}`);
    try {
      const where = supplierId ? { supplierId } : {};
      const orders = await this.purchaseOrderRepository.find({
        where,
        relations: ['supplier', 'store', 'items', 'items.item'],
        order: { createdAt: 'DESC' },
      });
      this.logger.log(`Found ${orders.length} purchase orders`);
      return orders;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch purchase orders: ${message}`, stack);
      throw new InternalServerErrorException(
        'Failed to fetch purchase orders',
        { cause: error },
      );
    }
  }

  async findOne(id: number) {
    this.logger.log(`Fetching purchase order with ID: ${id}`);
    try {
      const order = await this.purchaseOrderRepository.findOne({
        where: { id },
        relations: ['supplier', 'store', 'items', 'items.item'],
      });

      if (!order) {
        this.logger.warn(`Purchase order with ID ${id} not found`);
        throw new BadRequestException('Purchase order not found');
      }

      this.logger.log(`Found purchase order: ${order.poNumber}`);
      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch purchase order ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch purchase order', {
        cause: error,
      });
    }
  }

  async update(id: number, updateProcurementDto: UpdateProcurementDto) {
    this.logger.log(`Updating purchase order with ID: ${id}`);
    try {
      // Handle status type conversion
      const updateData: Partial<PurchaseOrder> = {
        ...(updateProcurementDto as Partial<PurchaseOrder>),
      };
      if (updateProcurementDto.status) {
        updateData.status = updateProcurementDto.status as POStatus;
      }

      const result = await this.purchaseOrderRepository.update(id, updateData);
      if (result.affected === 0) {
        this.logger.warn(`Purchase order with ID ${id} not found for update`);
        throw new BadRequestException('Purchase order not found');
      }
      this.logger.log(`Purchase order ${id} updated successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update purchase order ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to update purchase order',
        { cause: error },
      );
    }
  }

  async remove(id: number) {
    this.logger.log(`Soft deleting purchase order with ID: ${id}`);
    try {
      const result = await this.purchaseOrderRepository.softDelete(id);
      if (result.affected === 0) {
        this.logger.warn(`Purchase order with ID ${id} not found for deletion`);
        throw new BadRequestException('Purchase order not found');
      }
      this.logger.log(`Purchase order ${id} soft-deleted successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete purchase order ${id}: ${message}`,
        stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to delete purchase order',
        { cause: error },
      );
    }
  }

  async approve(id: number, approverId: number) {
    this.logger.log(`Approving purchase order ${id} by user ${approverId}`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Cannot approve. PO status must be PENDING_APPROVAL, current status: ${po.status}`,
        );
      }

      po.status = POStatus.APPROVED;
      po.approvedBy = approverId;
      po.approvedAt = new Date();

      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} approved successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to approve purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to approve purchase order', {
        cause: error,
      });
    }
  }

  async reject(id: number, approverId: number, reason?: string) {
    this.logger.log(`Rejecting purchase order ${id} by user ${approverId}`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Cannot reject. PO status must be PENDING_APPROVAL, current status: ${po.status}`,
        );
      }

      po.status = POStatus.CANCELLED;
      po.approvedBy = approverId;
      po.approvedAt = new Date();
      po.rejectionReason = reason || 'Rejected by manager';

      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} rejected successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to reject purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reject purchase order', {
        cause: error,
      });
    }
  }

  async findPendingApprovals() {
    this.logger.log('Fetching pending approval purchase orders');
    try {
      const orders = await this.purchaseOrderRepository.find({
        where: { status: POStatus.PENDING_APPROVAL },
        relations: ['supplier', 'store', 'items', 'items.item'],
        order: { createdAt: 'ASC' },
      });
      this.logger.log(`Found ${orders.length} pending approval purchase orders`);
      return orders;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to fetch pending approvals: ${message}`, stack);
      throw new InternalServerErrorException('Failed to fetch pending approvals', {
        cause: error,
      });
    }
  }

  async send(id: number) {
    this.logger.log(`Sending purchase order ${id}`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.APPROVED) {
        throw new BadRequestException(
          `Cannot send. PO status must be APPROVED, current status: ${po.status}`,
        );
      }

      po.status = POStatus.SENT;
      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} sent successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to send purchase order', {
        cause: error,
      });
    }
  }

  async confirm(id: number, confirmedBy: number, expectedDeliveryDate?: string, supplierNotes?: string) {
    this.logger.log(`Confirming purchase order ${id} by supplier`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.SENT) {
        throw new BadRequestException(
          `Cannot confirm. PO status must be SENT, current status: ${po.status}`,
        );
      }

      po.status = POStatus.CONFIRMED;
      po.confirmedBy = confirmedBy;
      po.confirmedAt = new Date();
      if (expectedDeliveryDate) {
        po.expectedDeliveryDate = new Date(expectedDeliveryDate);
      }
      if (supplierNotes) {
        po.supplierNotes = supplierNotes;
      }

      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} confirmed by supplier`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to confirm purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to confirm purchase order', {
        cause: error,
      });
    }
  }

  /**
   * Inventory staff nhận hàng từ PO ở trạng thái SENT
   */
  async receive(id: number, receivedBy: number) {
    this.logger.log(`Receiving purchase order ${id} by inventory staff ${receivedBy}`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.SENT) {
        throw new BadRequestException(
          `Cannot receive. PO status must be SENT, current status: ${po.status}`,
        );
      }

      const now = new Date();
      po.status = POStatus.CONFIRMED;
      po.confirmedBy = receivedBy;
      po.confirmedAt = now;
      po.actualDeliveryDate = now;

      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} received by inventory staff ${receivedBy}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to receive purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to receive purchase order', {
        cause: error,
      });
    }
  }

  /**
   * Inventory staff không nhận hàng từ PO ở trạng thái SENT
   */
  async rejectReceipt(id: number, rejectedBy: number, rejectionReason: string) {
    this.logger.log(`Rejecting receipt for purchase order ${id} by inventory staff ${rejectedBy}`);
    try {
      const po = await this.purchaseOrderRepository.findOne({
        where: { id },
      });

      if (!po) {
        throw new BadRequestException('Purchase order not found');
      }

      if (po.status !== POStatus.SENT) {
        throw new BadRequestException(
          `Cannot reject receipt. PO status must be SENT, current status: ${po.status}`,
        );
      }

      po.status = POStatus.CANCELLED;
      po.rejectionReason = rejectionReason;

      const result = await this.purchaseOrderRepository.save(po);
      this.logger.log(`Purchase order ${id} receipt rejected by inventory staff ${rejectedBy}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to reject receipt for purchase order ${id}: ${message}`, stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reject receipt', {
        cause: error,
      });
    }
  }
}
