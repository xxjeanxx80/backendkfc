import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
  Index,
} from 'typeorm';

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

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
