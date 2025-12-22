import { PartialType } from '@nestjs/swagger';
import { CreateInventoryTransactionDto } from './create-inventory-transaction.dto';

export class UpdateInventoryTransactionDto extends PartialType(
  CreateInventoryTransactionDto,
) {}
