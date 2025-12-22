import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { InventoryBatch } from '../../inventory-batches/entities/inventory-batch.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemName: string;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 50 })
  unit: string;

  @Column({ default: 10 })
  minStockLevel: number;

  @Column({ default: 100 })
  maxStockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  safetyStock: number;

  @Column({ type: 'int', nullable: true })
  leadTimeDays: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => InventoryBatch, (batch) => batch.item)
  inventoryBatches: InventoryBatch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
