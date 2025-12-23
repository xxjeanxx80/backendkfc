import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsEnum, IsIn } from 'class-validator';
import { CreateItemDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemDto) {
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
}
