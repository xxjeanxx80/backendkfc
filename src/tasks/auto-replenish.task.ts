import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockRequestsService } from '../stock-requests/stock-requests.service';

@Injectable()
export class AutoReplenishTask {
  private readonly logger = new Logger(AutoReplenishTask.name);

  constructor(
    private readonly stockRequestsService: StockRequestsService,
  ) {}

  /**
   * Auto replenish items below safety stock
   * Runs daily at 2:00 AM
   */
  @Cron('0 2 * * *', {
    name: 'auto-replenish',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleAutoReplenish() {
    this.logger.log('Starting scheduled auto replenishment task...');
    
    try {
      const results = await this.stockRequestsService.autoReplenishBelowSafetyStock();
      
      this.logger.log(
        `Auto replenishment completed. Processed ${results.length} items. ` +
        `Created ${results.filter(r => r.poId).length} purchase orders.`
      );
      
      return results;
    } catch (error) {
      this.logger.error(
        `Auto replenishment task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Manual trigger for testing (can be called via API)
   */
  async triggerManual() {
    this.logger.log('Manual auto replenishment triggered');
    return this.handleAutoReplenish();
  }
}

