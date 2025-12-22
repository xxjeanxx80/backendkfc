import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoReplenishTask } from './auto-replenish.task';
import { TasksController } from './tasks.controller';
import { StockRequestsModule } from '../stock-requests/stock-requests.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    StockRequestsModule,
  ],
  controllers: [TasksController],
  providers: [AutoReplenishTask],
  exports: [AutoReplenishTask],
})
export class TasksModule {}

