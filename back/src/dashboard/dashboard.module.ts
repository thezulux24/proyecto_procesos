import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CloudController } from '../cloud/cloud.controller';
import { CloudService } from '../cloud/cloud.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [DashboardController, CloudController],
  providers: [DashboardService, CloudService],
  exports: [DashboardService, CloudService],
})
export class DashboardModule {}