import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceLogDto } from './dto/create-service-log.dto';
import { UpdateServiceLogDto } from './dto/update-service-log.dto';

@Injectable()
export class ServiceLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.serviceLog.findMany({
      where: includeInactive ? undefined : { active: true },
      include: {
        device: true,
        operator: true,
        reservation: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const serviceLog = await this.prisma.serviceLog.findUnique({
      where: { id },
      include: {
        device: true,
        operator: true,
        reservation: true,
        telemetrySamples: true,
        videos: true,
      },
    });

    if (!serviceLog) {
      throw new NotFoundException(`Service log ${id} not found`);
    }

    return serviceLog;
  }

  create(data: CreateServiceLogDto) {
    return this.prisma.serviceLog.create({ data });
  }

  async update(id: number, data: UpdateServiceLogDto) {
    await this.findOne(id);
    return this.prisma.serviceLog.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.serviceLog.update({
      where: { id },
      data: { active: false },
    });
  }
}
