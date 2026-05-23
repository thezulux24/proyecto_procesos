import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { QrService } from '../common/utils/qr.service';
import { EmailService } from '../common/utils/email.service';
import { ServiceLogsService } from '../service-logs/service-logs.service';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrService: QrService,
    private readonly emailService: EmailService,
    private readonly serviceLogsService: ServiceLogsService,
  ) {}

  findAll(includeInactive = false) {
    return this.prisma.reservation.findMany({
      where: includeInactive ? undefined : { active: true },
      include: {
        device: true,
        operator: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        device: true,
        operator: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return reservation;
  }

  async create(data: CreateReservationDto) {
    const normalizedDevice = data.device.toUpperCase();
    const { device: _requestedDevice, ...baseData } = data;
    const expectedDeviceType =
      normalizedDevice === 'DRON' || normalizedDevice === 'DRONE' ? 'DRONE' : 'ROBOT';

    const selectedDevice =
      data.deviceId != null
        ? await this.prisma.device.findUnique({ where: { id: data.deviceId } })
        : await this.prisma.device.findFirst({
            where: {
              active: true,
              status: 'AVAILABLE',
              type: expectedDeviceType,
            },
            orderBy: { id: 'asc' },
          });

    if (!selectedDevice) {
      throw new BadRequestException(
        `No hay un ${expectedDeviceType === 'DRONE' ? 'dron' : 'robot'} disponible para esta reserva.`,
      );
    }

    const selectedOperator =
      data.operatorId != null
        ? await this.prisma.operator.findUnique({ where: { id: data.operatorId } })
        : await this.prisma.operator.findFirst({
            where: { active: true },
            orderBy: { id: 'asc' },
          });

    if (!selectedOperator) {
      throw new BadRequestException('No hay operadores activos disponibles para registrar la reserva.');
    }

    // Reserve the selected device and create reservation atomically.
    const reservation = await this.prisma.$transaction(async (tx) => {
      const reserveResult = await tx.device.updateMany({
        where: {
          id: selectedDevice.id,
          active: true,
          status: 'AVAILABLE',
        },
        data: {
          status: 'RESERVED',
        },
      });

      if (reserveResult.count === 0) {
        throw new BadRequestException(
          `El ${expectedDeviceType === 'DRONE' ? 'dron' : 'robot'} seleccionado ya no esta disponible.`,
        );
      }

      return tx.reservation.create({
        data: {
          ...baseData,
          deviceType: normalizedDevice,
          status: 'ACCEPTED',
          deviceId: selectedDevice.id,
          operatorId: selectedOperator.id,
        },
        include: {
          device: true,
          operator: true,
        },
      });
    });

    try {
      // Generate QR code
      const { qrCode, qrDataUrl } = await this.qrService.generateReservationQR(
        String(reservation.id),
        reservation.device.name,
        reservation.startAt,
      );

      // Update reservation with QR data
      const updatedReservation = await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          qrCode: qrCode.toString('base64'),
          qrDataUrl,
        },
        include: {
          device: true,
          operator: true,
        },
      });

      // Try to send email with QR (get operator email from database)
      const operator = await this.prisma.operator.findUnique({
        where: { id: reservation.operatorId },
      });

      if (operator?.email) {
        try {
          await this.emailService.sendReservationConfirmation(
            operator.email,
            String(reservation.id),
            reservation.device.name,
            reservation.startAt,
            qrDataUrl,
          );

        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Continue without throwing - reservation is still valid
        }
      }

      // Create initial service log entry
      try {
        await this.serviceLogsService.create({
          startTime: reservation.startAt,
          origin: 'SYSTEM_INIT',
          destination: 'SYSTEM_INIT',
          deviceId: reservation.deviceId,
          operatorId: reservation.operatorId,
          reservationId: reservation.id,
          serviceStatus: 'IN_PROGRESS',
          notes: 'Reserva creada - Pendiente de inicio',
        });
      } catch (logError) {
        console.error('Failed to create initial service log:', logError);
      }

      return updatedReservation;
    } catch (error) {
      console.error('Error processing reservation:', error);
      // Return reservation even if QR/email generation fails
      return reservation;
    }
  }

  async update(id: number, data: UpdateReservationDto) {
    await this.findOne(id);

    const { device, ...rest } = data;
    const updateData = {
      ...rest,
      ...(device ? { deviceType: device.toUpperCase() } : {}),
    };

    return this.prisma.reservation.update({ where: { id }, data: updateData });
  }

  async remove(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { device: true, operator: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    const now = new Date();
    const createdAt = new Date(reservation.createdAt);
    const msSinceCreated = now.getTime() - createdAt.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    // Penalize if more than 2 hours have passed since creation
    const penalize = msSinceCreated > twoHoursMs;

    const updatedReservation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { active: false, status: 'CANCELLED', penalty: penalize },
        include: { device: true, operator: true },
      });

      if (reservation.deviceId) {
        await tx.device.update({ where: { id: reservation.deviceId }, data: { status: 'AVAILABLE' } });
      }

      return updated;
    });

    // Notify requester about cancellation and penalty (best-effort)
    try {
      const requesterEmail = updatedReservation.email;
      if (requesterEmail) {
        const subject = `Reserva #${updatedReservation.id} cancelada`;
        const reason = penalize
          ? 'Se le ha aplicado una penalidad por cancelar la reserva con menos de 2 horas de anticipación.'
          : 'Su reserva fue cancelada sin penalidad.';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h3>Reserva cancelada</h3>
            <p>La reserva <strong>#${updatedReservation.id}</strong> programada para <strong>${new Date(
              updatedReservation.startAt,
            ).toLocaleString('es-ES')}</strong> fue cancelada por un administrador.</p>
            <p>${reason}</p>
          </div>
        `;

        await this.emailService.sendEmail({ to: requesterEmail, subject, html });
        // eslint-disable-next-line no-console
        console.log(`ReservationService: sent cancellation email to requester ${requesterEmail} for reservation ${updated.id}`);
      }
    } catch (err) {
      console.error('Failed to notify requester about reservation deletion', err);
    }

    return updatedReservation;
  }

  /**
   * Cancel a reservation. If cancellation happens within 2 hours of startAt,
   * a penalty flag is recorded. The device is released and the operator is notified.
   */
  async cancel(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { device: true, operator: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    const now = new Date();
    const createdAt = new Date(reservation.createdAt);
    const msSinceCreated = now.getTime() - createdAt.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    // Penalize if more than 2 hours have passed since creation
    const penalize = msSinceCreated > twoHoursMs;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: { active: false, status: 'CANCELLED', penalty: penalize },
        include: { device: true, operator: true },
      });

      if (reservation.deviceId) {
        await tx.device.update({ where: { id: reservation.deviceId }, data: { status: 'AVAILABLE' } });
      }

      return updatedReservation;
    });

    // Notify operator (best-effort)
    try {
      const operator = updated.operator;
      if (operator && operator.email) {
        const subject = `Reserva #${updated.id} cancelada`;
        const reason = penalize ? 'Se aplicó una penalidad por cancelación tardía.' : 'Cancelación sin penalidad.';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h3>Reserva cancelada</h3>
            <p>La reserva <strong>#${updated.id}</strong> programada para <strong>${new Date(updated.startAt).toLocaleString('es-ES')}</strong> fue cancelada.</p>
            <p>${reason}</p>
          </div>
        `;

        await this.emailService.sendEmail({ to: operator.email, subject, html });
        // eslint-disable-next-line no-console
        console.log(`ReservationService: sent cancellation email to operator ${operator.email} for reservation ${updated.id}`);
      }
    } catch (err) {
      console.error('Failed to notify operator about reservation cancellation', err);
    }

    // Notify requester about cancellation and penalty (best-effort)
    try {
      const requesterEmail = updated.email;
      if (requesterEmail) {
        const subject = `Su reserva #${updated.id} ha sido cancelada`;
        const reason = penalize
          ? 'Se le ha aplicado una penalidad por cancelar la reserva pasado el periodo permitido.'
          : 'Su reserva fue cancelada sin penalidad.';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h3>Reserva cancelada</h3>
            <p>La reserva <strong>#${updated.id}</strong> programada para <strong>${new Date(updated.startAt).toLocaleString('es-ES')}</strong> fue cancelada.</p>
            <p>${reason}</p>
          </div>
        `;

        await this.emailService.sendEmail({ to: requesterEmail, subject, html });
        // eslint-disable-next-line no-console
        console.log(`ReservationService: sent cancellation email to requester ${requesterEmail} for reservation ${updatedReservation.id}`);
      }
    } catch (err) {
      console.error('Failed to notify requester about reservation cancellation', err);
    }

    return updated;
  }
}
