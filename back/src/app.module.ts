import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DevicesModule } from './devices/devices.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ServiceLogsModule } from './service-logs/service-logs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { OperatorsModule } from './operators/operators.module';

@Module({
  imports: [PrismaModule, DevicesModule, ReservationsModule, ServiceLogsModule, AuthModule, UsersModule, CommonModule, OperatorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
