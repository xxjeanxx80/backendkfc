import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StockRequestsService } from './stock-requests.service';
import { CreateStockRequestDto } from './dto/create-stock-request.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  StockRequest,
  StockRequestStatus,
} from './entities/stock-request.entity';

@ApiTags('stock-requests')
@ApiBearerAuth()
@Controller('stock-requests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StockRequestsController {
  constructor(private readonly service: StockRequestsService) {}

  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  @Get()
  list(
    @Query('status') status?: StockRequestStatus,
    @Query('storeId') storeId?: string,
  ): Promise<StockRequest[]> {
    return this.service.findAll(status, storeId ? +storeId : undefined);
  }

  @Post()
  @Roles('STORE_MANAGER')
  create(@Body() dto: CreateStockRequestDto) {
    return this.service.create(dto);
  }

  @Post('generate-po')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  generatePOFromRequests(@Body() body: { requestIds: number[] }) {
    return this.service.generatePOFromRequests(body.requestIds);
  }

  @Post('auto-po')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  autoGeneratePO(@Query('storeId') storeId?: string) {
    return this.service.autoGeneratePO(storeId ? +storeId : undefined);
  }

  @Patch(':id')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  update(@Param('id') id: string, @Body() body: { poId?: number; status?: StockRequestStatus }) {
    return this.service.update(+id, body);
  }

  @Post('cancel')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  cancelRequests(@Body() body: { requestIds: number[] }) {
    return this.service.cancelRequests(body.requestIds);
  }

  @Post('auto-replenish')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  autoReplenishBelowSafetyStock(@Query('storeId') storeId?: string) {
    return this.service.autoReplenishBelowSafetyStock(storeId ? +storeId : undefined);
  }

  @Post('express-order')
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  expressOrder(
    @Body() body: { itemId: number; storeId: number; requestedQty: number },
    @Request() req: { user: { userId: number } },
  ) {
    return this.service.expressOrder(
      body.itemId,
      body.storeId,
      body.requestedQty,
      req.user?.userId,
    );
  }
}
