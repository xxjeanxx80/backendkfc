import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TemperatureSimulatorService } from './temperature-simulator.service';
import { TemperatureMonitoringService } from './temperature-monitoring.service';

@ApiTags('temperature')
@ApiBearerAuth()
@Controller('temperature')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemperatureController {
  constructor(
    private readonly simulatorService: TemperatureSimulatorService,
    private readonly monitoringService: TemperatureMonitoringService,
  ) {}

  @Get('alerts')
  @Roles('STORE_MANAGER', 'INVENTORY_STAFF', 'ADMIN')
  async getBatchesWithAlerts() {
    return this.monitoringService.getBatchesWithAlerts();
  }

  @Post('check')
  @Roles('ADMIN')
  async checkAlerts() {
    await this.monitoringService.checkTemperatureAlerts();
    return { message: 'Temperature alerts checked' };
  }
}


