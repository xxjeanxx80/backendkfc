import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryBatch } from '../../inventory-batches/entities/inventory-batch.entity';
import { Item } from '../../items/entities/item.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum ReferenceType {
  PO = 'PO',
  GRN = 'GRN',
  ADJUSTMENT = 'ADJUSTMENT',
  SALES = 'SALES',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  batchId: number;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batchId' })
  batch: InventoryBatch;

  @Column()
  itemId: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column()
  quantity: number;

  @Column({
    type: 'enum',
    enum: ReferenceType,
  })
  referenceType: ReferenceType;

  @Column({ nullable: true })
  referenceId: number;

  @Column({ nullable: true })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
