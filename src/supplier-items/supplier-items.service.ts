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

  async findBySupplierId(supplierId: number) {
    return await this.supplierItemRepo.find({
      where: { supplierId, isActive: true },
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBestMappingForItem(
    itemId: number,
    at?: Date,
  ): Promise<SupplierItem | null> {
    const mappings = await this.supplierItemRepo.find({
      where: { itemId, isActive: true },
    });
    if (mappings.length === 0) return null;
    const preferred = mappings.find((m) => m.isPreferred);
    if (preferred) return preferred;
    return mappings.reduce((min, cur) =>
      cur.unitPrice < min.unitPrice ? cur : min,
    );
  }
}
