import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';

@Injectable()
export class OperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.operator.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const operator = await this.prisma.operator.findUnique({ where: { id } });
    if (!operator) {
      throw new NotFoundException(`Operator ${id} not found`);
    }
    return operator;
  }

  async create(data: CreateOperatorDto) {
    const existing = await this.prisma.operator.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Operator with this email already exists');
    }

    return this.prisma.operator.create({
      data: {
        ...data,
        active: true,
      },
    });
  }

  async update(id: number, data: UpdateOperatorDto) {
    await this.findOne(id);

    if (data.email) {
      const existing = await this.prisma.operator.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Operator with this email already exists');
      }
    }

    return this.prisma.operator.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.operator.update({
      where: { id },
      data: { active: false },
    });
  }
}
