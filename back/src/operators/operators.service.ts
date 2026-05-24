import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { EmailService } from '../common/utils/email.service';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';

@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
  ) {}

  findAll(includeInactive = false) {
    return this.prisma.operator.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: { createdAt: 'desc' },
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

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const role = await this.prisma.role.findFirst({ where: { nombre: 'OPERADOR', active: true } });
    if (!role) {
      throw new BadRequestException('No se encontro el rol OPERADOR para crear la cuenta');
    }

    const passwordHash = await this.authService.hashPassword(crypto.randomBytes(12).toString('hex'));

    const { operator, user } = await this.prisma.$transaction(async (tx) => {
      const createdOperator = await tx.operator.create({
        data: {
          ...data,
          active: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          fullName: data.fullName,
          passwordHash,
          roleId: role.id,
          active: true,
        },
      });

      return { operator: createdOperator, user: createdUser };
    });

    const resetToken = this.authService.generatePasswordResetToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBaseUrl.replace(/\/$/, '')}/reset-password`;

    try {
      await this.emailService.sendPasswordReset(user.email, resetToken, resetUrl);
    } catch (error) {
      console.error('Failed to send operator password reset email:', error);
    }

    await this.createOperatorAuditLog({
      operatorId: operator.id,
      action: 'CREAR',
      description: `Se creo el operador ${operator.fullName} (${operator.email}).`,
    });

    return operator;
  }

  async update(id: number, data: UpdateOperatorDto) {
    await this.findOne(id);

    if (data.email) {
      const existing = await this.prisma.operator.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Operator with this email already exists');
      }
    }

    const updatedOperator = await this.prisma.operator.update({
      where: { id },
      data,
    });

    await this.createOperatorAuditLog({
      operatorId: updatedOperator.id,
      action: 'EDITAR',
      description: `Se edito el operador ${updatedOperator.fullName} (${updatedOperator.email}).`,
    });

    return updatedOperator;
  }

  async remove(id: number) {
    const operator = await this.findOne(id);
    const updatedOperator = await this.prisma.operator.update({
      where: { id },
      data: { active: false },
    });

    await this.createOperatorAuditLog({
      operatorId: updatedOperator.id,
      action: 'ELIMINAR',
      description: `Se desactivo el operador ${operator.fullName} (${operator.email}).`,
    });

    return updatedOperator;
  }

  async reactivate(id: number) {
    const operator = await this.findOne(id);
    const updatedOperator = await this.prisma.operator.update({
      where: { id },
      data: { active: true },
    });

    await this.createOperatorAuditLog({
      operatorId: updatedOperator.id,
      action: 'ACTIVAR',
      description: `Se activo el operador ${operator.fullName} (${operator.email}).`,
    });

    return updatedOperator;
  }

  private async createOperatorAuditLog(input: { operatorId: number; action: string; description: string }) {
    const auditDevice = await this.prisma.device.findFirst({
      where: { active: true },
      orderBy: { id: 'asc' },
    });

    if (!auditDevice) {
      console.warn(`No active device available to write operator audit log: ${input.action}`);
      return;
    }

    const operator = await this.prisma.operator.findUnique({
      where: { id: input.operatorId },
    });

    if (!operator) {
      return;
    }

    await this.prisma.serviceLog.create({
      data: {
        startTime: new Date(),
        origin: 'OPERADORES',
        destination: 'BITACORA',
        deviceId: auditDevice.id,
        operatorId: operator.id,
        serviceStatus: 'COMPLETED',
        orderStatus: input.action,
        sensorSummary: input.description,
        notes: input.description,
      },
    });
  }
}
