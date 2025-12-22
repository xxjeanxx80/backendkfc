import { IsNotEmpty, IsNumber, IsString, IsDateString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GoodsReceiptItemDto {
  @IsNotEmpty()
  @IsNumber()
  itemId: number;

  @IsNotEmpty()
  @IsString()
  batchNo: string;

  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;

  @IsNotEmpty()
  @IsNumber()
  receivedQty: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;
}

export class CreateGoodsReceiptDto {
  @IsNotEmpty()
  @IsNumber()
  poId: number;

  @IsNotEmpty()
  @IsDateString()
  receivedDate: string;

  @IsNotEmpty()
  @IsNumber()
  receivedBy: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items: GoodsReceiptItemDto[];
}
