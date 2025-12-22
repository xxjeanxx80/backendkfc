import {
  Controller,
  Get,
  UseGuards,
  Query,
  Logger,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('inventory')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('procurement')
  @Roles('STORE_MANAGER', 'PROCUREMENT_STAFF', 'ADMIN')
  getProcurementReport() {
    return this.reportsService.getProcurementReport();
  }

  @Get('sales')
  @Roles('STORE_MANAGER', 'ADMIN')
  getSalesReport(@Query('storeId') storeId?: string) {
    return this.reportsService.getSalesReport(storeId ? +storeId : undefined);
  }

  @Get('low-stock-alerts')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  getLowStockAlerts() {
    return this.reportsService.getLowStockAlerts();
  }

  @Get('gross-profit')
  @Roles('STORE_MANAGER', 'ADMIN')
  getGrossProfit(
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getGrossProfitReport(
      storeId ? +storeId : undefined,
      start,
      end,
    );
  }

  @Get('expired-items')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  getExpiredItems(@Query('daysThreshold') daysThreshold?: string) {
    const threshold = daysThreshold ? parseInt(daysThreshold, 10) : 7;
    return this.reportsService.getExpiredItemsReport(threshold);
  }
}
