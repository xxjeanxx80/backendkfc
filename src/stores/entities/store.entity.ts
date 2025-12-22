import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InventoryBatch } from '../../inventory-batches/entities/inventory-batch.entity';
import { PurchaseOrder } from '../../procurement/entities/procurement.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.store)
  users: User[];

  @OneToMany(() => InventoryBatch, (batch) => batch.store)
  inventoryBatches: InventoryBatch[];

  @OneToMany(() => PurchaseOrder, (po) => po.store)
  purchaseOrders: PurchaseOrder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
