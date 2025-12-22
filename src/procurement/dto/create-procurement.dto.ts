import {
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  itemId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  unitPrice: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateProcurementDto {
  @IsString()
  @IsNotEmpty()
  poNumber: string;

  @IsNumber()
  @IsNotEmpty()
  supplierId: number;

  @IsNumber()
  @IsNotEmpty()
  storeId: number;

  @IsDateString()
  orderDate: string;

  @IsDateString()
  expectedDeliveryDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @IsString()
  status: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  notes?: string;
}
