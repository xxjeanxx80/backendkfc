import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryBatch } from '../../inventory-batches/entities/inventory-batch.entity';

@Entity('temperature_logs')
export class TemperatureLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  batchId: number;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batchId' })
  batch: InventoryBatch;

  @Column({ type: 'float' })
  temperature: number;

  @Column({ type: 'datetime' })
  recordedAt: Date;

  @Column({ default: false })
  isAlert: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}


