import { Module } from '@nestjs/common';
import { ServiceLogsController } from './service-logs.controller';
import { ServiceLogsService } from './service-logs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceLogsController],
  providers: [ServiceLogsService],
  exports: [ServiceLogsService],
})
export class ServiceLogsModule {}
