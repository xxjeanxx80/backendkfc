import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierItem } from './entities/supplier-item.entity';

@Injectable()
export class SupplierItemsService {
  constructor(
    @InjectRepository(SupplierItem)
    private readonly supplierItemRepo: Repository<SupplierItem>,
  ) {}

  async findBestMappingForItem(
    itemId: number,
    at?: Date,
  ): Promise<SupplierItem | null> {
    const mappings = await this.supplierItemRepo.find({
      where: { itemId, isActive: true },
    });
    if (mappings.length === 0) return null;
    const now = at ?? new Date();
    const valid = mappings.filter((m) => {
      const fromOk = !m.effectiveFrom || m.effectiveFrom <= now;
      const toOk = !m.effectiveTo || m.effectiveTo >= now;
      return fromOk && toOk;
    });
    const pool = valid.length ? valid : mappings;
    const preferred = pool.find((m) => m.isPreferred);
    if (preferred) return preferred;
    return pool.reduce((min, cur) =>
      cur.unitPrice < min.unitPrice ? cur : min,
    );
  }
}
