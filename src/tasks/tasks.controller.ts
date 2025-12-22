import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AutoReplenishTask } from './auto-replenish.task';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TasksController {
  constructor(private readonly autoReplenishTask: AutoReplenishTask) {}

  @Post('auto-replenish/trigger')
  @Roles('PROCUREMENT_STAFF', 'ADMIN')
  async triggerAutoReplenish() {
    return this.autoReplenishTask.triggerManual();
  }
}

