import {
  IsString,
  IsNumber,
  IsDateString,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';
import { BatchStatus } from '../entities/inventory-batch.entity';

export class CreateInventoryBatchDto {
  @IsNumber()
  @IsNotEmpty()
  itemId: number;

  @IsNumber()
  @IsNotEmpty()
  storeId: number;

  @IsString()
  @IsNotEmpty()
  batchNo: string;

  @IsNumber()
  @Min(1)
  quantityReceived: number;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;

  @IsOptional()
  status?: BatchStatus;
}
