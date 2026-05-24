import { Controller, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('monitoring')
  getMonitoringOverview() {
    return this.dashboardService.getMonitoringOverview();
  }

  @Sse('stream')
  stream(@Query('token') _token?: string) {
    return this.dashboardService.stream();
  }
}