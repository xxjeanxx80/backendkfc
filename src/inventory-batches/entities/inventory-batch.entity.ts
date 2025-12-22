import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Store } from '../../stores/entities/store.entity';

export enum BatchStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  EXPIRED = 'expired',
}

@Entity('inventory_batches')
@Unique(['storeId', 'batchNo'])
export class InventoryBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => Item, (item) => item.inventoryBatches)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ length: 100 })
  batchNo: string;

  @Column({ type: 'datetime' })
  expiryDate: Date;

  @Column({ default: 0 })
  quantityOnHand: number;

  @Column({ type: 'float', nullable: true })
  temperature: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost: number;

  @Column({
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.IN_STOCK,
  })
  status: BatchStatus;

  @Column()
  storeId: number;

  @ManyToOne(() => Store, (store) => store.inventoryBatches)
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
