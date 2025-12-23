import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Store } from '../../stores/entities/store.entity';

export enum StockRequestStatus {
  REQUESTED = 'requested',
  PO_GENERATED = 'po_generated',
  CANCELLED = 'cancelled',
}

export enum StockRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('stock_requests')
export class StockRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  storeId: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Index()
  @Column({ type: 'int' })
  itemId: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'int' })
  requestedQty: number;

  @Column({
    type: 'enum',
    enum: StockRequestStatus,
    default: StockRequestStatus.REQUESTED,
  })
  status: StockRequestStatus;

  @Column({
    type: 'enum',
    enum: StockRequestPriority,
    default: StockRequestPriority.MEDIUM,
  })
  priority: StockRequestPriority;

  @Column({ type: 'int', nullable: true })
  requestedBy: number | null;

  @Column({ type: 'int', nullable: true })
  poId: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
