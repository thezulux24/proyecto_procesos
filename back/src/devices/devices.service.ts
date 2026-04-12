import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.device.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  create(data: CreateDeviceDto) {
    return this.prisma.device.create({ data });
  }

  async update(id: number, data: UpdateDeviceDto) {
    await this.findOne(id);
    return this.prisma.device.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.device.update({
      where: { id },
      data: { active: false },
    });
  }
}
