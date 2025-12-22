import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierItem } from './entities/supplier-item.entity';
import { SupplierItemsService } from './supplier-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierItem])],
  providers: [SupplierItemsService],
  exports: [SupplierItemsService, TypeOrmModule],
})
export class SupplierItemsModule {}
