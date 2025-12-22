import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('goods-receipts')
@ApiBearerAuth()
@Controller('goods-receipts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GoodsReceiptsController {
  private readonly logger = new Logger(GoodsReceiptsController.name);

  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(
    @Body() createGoodsReceiptDto: CreateGoodsReceiptDto,
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      this.logger.log(
        `Creating goods receipt by user: ${req.user.userId} with role: ${req.user.role}`,
      );

      if (!req.user || !req.user.userId) {
        throw new HttpException(
          {
            success: false,
            message: 'Unauthorized access',
            error: 'User not authenticated',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.goodsReceiptsService.create(
        createGoodsReceiptDto,
        req.user.userId,
      );

      return {
        success: true,
        message: 'Goods receipt created successfully',
        data: result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create goods receipt';
      this.logger.error(`Failed to create goods receipt: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: message || 'Failed to create goods receipt',
          error: message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  findAll() {
    return this.goodsReceiptsService.findAll();
  }

  @Get(':id')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.goodsReceiptsService.findOne(+id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.goodsReceiptsService.remove(+id);
  }
}
