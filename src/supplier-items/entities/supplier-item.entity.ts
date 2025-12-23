import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';

@Entity('supplier_items')
@Unique(['supplierId', 'itemId'])
export class SupplierItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  supplierId: number;

  @Index()
  @Column()
  itemId: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'int', default: 1 })
  minOrderQty: number;

  @Column({ type: 'int', nullable: true })
  leadTimeDays: number | null;

  @Column({ default: false })
  isPreferred: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
