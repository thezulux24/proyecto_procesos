import { Module } from '@nestjs/common';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
