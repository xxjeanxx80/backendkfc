import { PartialType } from '@nestjs/swagger';
import { CreateInventoryBatchDto } from './create-inventory-batch.dto';

export class UpdateInventoryBatchDto extends PartialType(
  CreateInventoryBatchDto,
) {}
