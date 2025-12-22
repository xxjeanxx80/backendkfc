import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from '../../procurement/entities/procurement.entity';
import { User } from '../../users/entities/user.entity';
import { Item } from '../../items/entities/item.entity';

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  grnNumber: string;

  @Column()
  poId: number;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'poId' })
  purchaseOrder: PurchaseOrder;

  @Column({ type: 'datetime' })
  receivedDate: Date;

  @Column({ type: 'int', nullable: true })
  receivedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receivedBy' })
  receivedByUser: User;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt)
  items: GoodsReceiptItem[];

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  grnId: number;

  @ManyToOne(() => GoodsReceipt, (grn) => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grnId' })
  goodsReceipt: GoodsReceipt;

  @Column()
  itemId: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ length: 100 })
  batchNo: string;

  @Column({ type: 'datetime' })
  expiryDate: Date;

  @Column()
  receivedQty: number;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
