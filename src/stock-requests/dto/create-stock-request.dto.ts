import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { StockRequestPriority } from '../entities/stock-request.entity';

export class CreateStockRequestDto {
  @IsInt()
  @Min(1)
  storeId: number;

  @IsInt()
  @Min(1)
  itemId: number;

  @IsInt()
  @Min(1)
  requestedQty: number;

  @IsEnum(StockRequestPriority)
  @IsOptional()
  priority?: StockRequestPriority;

  @IsOptional()
  requestedBy?: number;

  @IsOptional()
  notes?: string;
}
