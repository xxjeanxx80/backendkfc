import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  itemName: string;

  @IsString()
  sku: string;

  @IsString()
  category: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  @IsEnum(['cold', 'frozen'])
  storageType?: 'cold' | 'frozen';

  @IsOptional()
  @IsNumber()
  minTemperature?: number;

  @IsOptional()
  @IsNumber()
  maxTemperature?: number;

  @IsOptional()
  isActive?: boolean;
}
