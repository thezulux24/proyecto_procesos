import { Injectable, MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeviceStatus, Prisma, ReservationStatus, ServiceStatus } from '@prisma/client';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { CloudService } from '../cloud/cloud.service';
import { QrService } from '../common/utils/qr.service';
import { EmailService } from '../common/utils/email.service';
import { ReservationsService } from '../reservations/reservations.service';

type DashboardOverview = {
  generatedAt: string;
  metrics: {
    activeReservations: number;
    activeServices: number;
    availableDevices: number;
    inServiceDevices: number;
    maintenanceDevices: number;
    robotAvailability: { available: number; total: number };
    droneAvailability: { available: number; total: number };
    cloudVideos: number;
  };
  activity: Array<{
    title: string;
    detail: string;
    timestamp: string;
  }>;
  videos: Array<{
    id: number;
    serviceLogId: number | null;
    cloudUrl: string;
    deviceName?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
};

type ServiceLogWithRelations = Prisma.ServiceLogGetPayload<{
  include: {
    device: true;
    operator: true;
    reservation: true;
    telemetrySamples: true;
    videos: true;
  };
}>;

type DeviceMonitoringWithTelemetry = Prisma.DeviceGetPayload<{
  include: {
    telemetry: {
      orderBy: {
        recordedAt: 'desc';
      };
      take: 1;
    };
    services: {
      where: {
        active: true;
      };
      orderBy: {
        updatedAt: 'desc';
      };
      take: 1;
      include: {
        operator: true;
      };
    };
  };
}>;

type MonitoringDevice = {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  batteryLevel: number;
  lastKnownLocation: string | null;
  active: boolean;
  updatedAt: string;
  latestTelemetryAt: string | null;
  sensorStatus: string | null;
  payloadStatus: string | null;
  currentService: {
    id: number;
    operatorName: string | null;
    status: string;
  } | null;
};

type MonitoringOverview = {
  generatedAt: string;
  summary: {
    activeDevices: number;
    availableDevices: number;
    inServiceDevices: number;
    maintenanceDevices: number;
    offlineDevices: number;
  };
  devices: MonitoringDevice[];
};

const DEMO_SERVICE_DURATION_MS = 30 * 1000;
const BATTERY_LOW_THRESHOLD = 10;
const BATTERY_RECOVERY_THRESHOLD = 70;
const BATTERY_DRAIN_STEP = 6;
const BATTERY_RECOVERY_STEP = 12;

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly snapshotSubject = new Subject<DashboardOverview>();
  private demoTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudService: CloudService,
    private readonly qrService: QrService,
    private readonly emailService: EmailService,
    private readonly reservationsService: ReservationsService,
  ) {}

  onModuleInit() {
    if (process.env.DEMO_AUTOPILOT === 'false' || process.env.NODE_ENV === 'test') {
      return;
    }

    void this.publishSnapshot();
    this.demoTimer = setInterval(() => {
      void this.advanceDemoState();
    }, 5000);
  }

  onModuleDestroy() {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
    }

    this.snapshotSubject.complete();
  }

  stream(): Observable<MessageEvent> {
    return this.snapshotSubject.asObservable().pipe(map((snapshot) => ({ data: snapshot })));
  }

  async getOverview(): Promise<DashboardOverview> {
    const [devices, reservations, serviceLogs, videos] = await Promise.all([
      this.prisma.device.findMany({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.reservation.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          device: true,
          operator: true,
        },
      }),
      this.prisma.serviceLog.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          device: true,
          operator: true,
          reservation: true,
          telemetrySamples: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
          videos: true,
        },
      }),
      this.prisma.videoRecord.findMany({
        orderBy: { createdAt: 'desc' },
        include: { device: true },
      }),
    ]);

    const activeReservations = reservations.filter((reservation) => {
      return reservation.active && reservation.status !== 'CANCELLED' && reservation.status !== 'COMPLETED';
    }).length;

    const activeServices = serviceLogs.filter((serviceLog) => serviceLog.serviceStatus === ServiceStatus.IN_PROGRESS && serviceLog.active).length;
    const availableDevices = devices.filter((device) => device.active && device.status === DeviceStatus.AVAILABLE).length;
    const inServiceDevices = devices.filter((device) => device.active && device.status === DeviceStatus.IN_SERVICE).length;
    const maintenanceDevices = devices.filter((device) => device.active && device.status === DeviceStatus.MAINTENANCE).length;

    const robots = devices.filter((device) => device.type === 'ROBOT' && device.active);
    const drones = devices.filter((device) => device.type === 'DRONE' && device.active);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        activeReservations,
        activeServices,
        availableDevices,
        inServiceDevices,
        maintenanceDevices,
        robotAvailability: {
          available: robots.filter((device) => device.status === DeviceStatus.AVAILABLE).length,
          total: robots.length,
        },
        droneAvailability: {
          available: drones.filter((device) => device.status === DeviceStatus.AVAILABLE).length,
          total: drones.length,
        },
        cloudVideos: videos.length,
      },
      activity: this.buildActivityFeed(serviceLogs, reservations, videos),
      videos: videos.map((v) => ({
        id: v.id,
        serviceLogId: v.serviceLogId ?? null,
        cloudUrl: v.cloudUrl,
        deviceName: v.device?.name ?? null,
        startedAt: v.startedAt ? v.startedAt.toISOString() : null,
        endedAt: v.endedAt ? v.endedAt.toISOString() : null,
      })),
    };
  }

  async getMonitoringOverview(): Promise<MonitoringOverview> {
    const devices = await this.prisma.device.findMany({
      where: { active: true },
      orderBy: [{ name: 'asc' }],
      include: {
        telemetry: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        services: {
          where: { active: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            operator: true,
          },
        },
      },
    }) as DeviceMonitoringWithTelemetry[];

    const activeDevices = devices.length;
    const availableDevices = devices.filter((device) => device.status === DeviceStatus.AVAILABLE).length;
    const inServiceDevices = devices.filter((device) => device.status === DeviceStatus.IN_SERVICE).length;
    const maintenanceDevices = devices.filter((device) => device.status === DeviceStatus.MAINTENANCE).length;
    const offlineDevices = devices.filter((device) => device.status === DeviceStatus.OFFLINE).length;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        activeDevices,
        availableDevices,
        inServiceDevices,
        maintenanceDevices,
        offlineDevices,
      },
      devices: devices.map((device) => {
        const latestTelemetry = device.telemetry[0] ?? null;
        const currentService = device.services[0] ?? null;

        return {
          id: device.id,
          code: device.code,
          name: device.name,
          type: device.type,
          status: device.status,
          batteryLevel: device.batteryLevel,
          lastKnownLocation: device.lastKnownLocation,
          active: device.active,
          updatedAt: device.updatedAt.toISOString(),
          latestTelemetryAt: latestTelemetry?.recordedAt.toISOString() ?? null,
          sensorStatus: latestTelemetry?.sensorStatus ?? null,
          payloadStatus: latestTelemetry?.payloadStatus ?? null,
          currentService: currentService
            ? {
                id: currentService.id,
                operatorName: currentService.operator?.fullName ?? null,
                status: currentService.serviceStatus,
              }
            : null,
        };
      }),
    };
  }

  private buildActivityFeed(serviceLogs: any[], reservations: any[], videos: any[]) {
    const items = [
      ...serviceLogs.slice(0, 4).map((serviceLog) => ({
        title: `Servicio #${serviceLog.id} ${serviceLog.serviceStatus === 'COMPLETED' ? 'cerrado' : 'activo'}`,
        detail: `${serviceLog.device?.name ?? 'Dispositivo'} - ${serviceLog.operator?.fullName ?? 'Operador'}${serviceLog.telemetrySamples.length > 0 ? ` · ${serviceLog.telemetrySamples[0].batteryLevel}% bateria` : ''}`,
        timestamp: (serviceLog.updatedAt || serviceLog.startTime).toISOString(),
      })),
      ...reservations.slice(0, 4).map((reservation) => ({
        title: `Reserva #${reservation.id} ${reservation.status.toLowerCase()}`,
        detail: `${reservation.requestedBy} · ${reservation.device?.name ?? reservation.deviceType}`,
        timestamp: reservation.updatedAt.toISOString(),
      })),
      ...videos.slice(0, 3).map((video) => ({
        title: `Video en nube para servicio #${video.serviceLogId ?? video.id}`,
        detail: `${video.cloudProvider} · ${video.device?.name ?? 'Dispositivo'}`,
        timestamp: video.updatedAt.toISOString(),
      })),
    ];

    return items
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 4)
      .map((item) => ({
        ...item,
        detail: this.toRelativeTime(item.timestamp),
      }));
  }

  private toRelativeTime(timestamp: string) {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) {
      return `hace ${diffMinutes} min`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `hace ${diffHours} h`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `hace ${diffDays} d`;
  }

  private async publishSnapshot() {
    const snapshot = await this.getOverview();
    this.snapshotSubject.next(snapshot);
  }

  private async advanceDemoState() {
    const activeServices = await this.prisma.serviceLog.findMany({
      where: {
        active: true,
        serviceStatus: ServiceStatus.IN_PROGRESS,
      },
      include: {
        device: true,
        operator: true,
        reservation: true,
        telemetrySamples: {
          orderBy: { recordedAt: 'asc' },
        },
        videos: true,
      },
      orderBy: { id: 'asc' },
    });

    const maintenanceDevices = await this.prisma.device.findMany({
      where: {
        active: true,
        status: DeviceStatus.MAINTENANCE,
      },
      orderBy: { updatedAt: 'asc' },
    });

    const startedServices = await this.bootstrapDemoServices();
    const servicesToAdvance = [...activeServices, ...startedServices];

    if (servicesToAdvance.length === 0 && maintenanceDevices.length === 0) {
      await this.publishSnapshot();
      return;
    }

    for (const service of servicesToAdvance) {
      await this.appendTelemetry(service);
    }

    for (const device of maintenanceDevices) {
      await this.appendMaintenanceTelemetry(device);
    }

    await this.publishSnapshot();
  }

  private async bootstrapDemoServices(): Promise<ServiceLogWithRelations[]> {
    const availableDevices = await this.prisma.device.findMany({
      where: {
        active: true,
        status: DeviceStatus.AVAILABLE,
        batteryLevel: {
          gte: BATTERY_LOW_THRESHOLD,
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    if (availableDevices.length === 0) {
      return [];
    }

    const operators = await this.prisma.operator.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'asc' },
    });

    if (operators.length === 0) {
      return [];
    }

    const startedAt = new Date();
    const queuedDevices = availableDevices;

    const createdServices: Array<{
      serviceId: number;
      reservationId: number;
      deviceId: number;
      operatorId: number;
      operatorEmail: string | null;
      deviceName: string;
      startAt: Date;
    }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < queuedDevices.length; index += 1) {
        const device = queuedDevices[index];
        const operator = operators[index % operators.length];
        const endedAt = new Date(startedAt.getTime() + DEMO_SERVICE_DURATION_MS);

        await tx.device.update({
          where: { id: device.id },
          data: { status: DeviceStatus.IN_SERVICE },
        });

        const reservation = await tx.reservation.create({
          data: {
            object: 'Servicio automatizado demo',
            deviceType: device.type,
            requestedBy: 'Sistema demo',
            startAt: startedAt,
            endAt: endedAt,
            email: null,
            status: ReservationStatus.IN_PROGRESS,
            deviceId: device.id,
            operatorId: operator.id,
          },
        });

        const service = await tx.serviceLog.create({
          data: {
            startTime: startedAt,
            origin: 'Campus central',
            destination: device.type === 'DRONE' ? 'Cobertura demo' : 'Ruta demo',
            serviceStatus: ServiceStatus.IN_PROGRESS,
            sensorSummary: 'Simulacion automatica inicializada',
            orderStatus: 'En proceso',
            notes: 'Servicio de demo asociado a una reserva automatica',
            deviceId: device.id,
            operatorId: operator.id,
            reservationId: reservation.id,
          },
        });

        createdServices.push({
          serviceId: service.id,
          reservationId: reservation.id,
          deviceId: device.id,
          operatorId: operator.id,
          operatorEmail: operator.email,
          deviceName: device.name,
          startAt: startedAt,
        });
      }
    });

    if (createdServices.length === 0) {
      return [];
    }

    for (const created of createdServices) {
      try {
        const { qrCode, qrDataUrl } = await this.qrService.generateReservationQR(
          String(created.reservationId),
          created.deviceName,
          created.startAt,
        );

        await this.prisma.reservation.update({
          where: { id: created.reservationId },
          data: {
            qrCode: qrCode.toString('base64'),
            qrDataUrl,
          },
        });

        await this.reservationsService.recordAuditLog({
          reservation: {
            id: created.reservationId,
            deviceId: created.deviceId,
            operatorId: created.operatorId,
          },
          action: 'CREAR',
          description: `La simulacion creo la reserva #${created.reservationId} para el dispositivo ${created.deviceName}.`,
        });

        if (created.operatorEmail) {
          await this.emailService.sendReservationConfirmation(
            created.operatorEmail,
            String(created.reservationId),
            created.deviceName,
            created.startAt,
            qrDataUrl,
          );
        }
      } catch (error) {
        console.error('Failed to send demo reservation confirmation:', error);
      }
    }

    return this.prisma.serviceLog.findMany({
      where: {
        id: { in: createdServices.map((service) => service.serviceId) },
      },
      include: {
        device: true,
        operator: true,
        reservation: true,
        telemetrySamples: {
          orderBy: { recordedAt: 'asc' },
        },
        videos: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  private async appendTelemetry(serviceLog: ServiceLogWithRelations) {
    if (!serviceLog.device) {
      return;
    }

    const sampleCount = serviceLog.telemetrySamples.length;
    const nextBattery = Math.max(BATTERY_LOW_THRESHOLD, serviceLog.device.batteryLevel - (sampleCount >= 3 ? BATTERY_DRAIN_STEP : 3));
    const latitude = Number((-6.2589 + sampleCount * 0.00018 + Math.random() * 0.00005).toFixed(7));
    const longitude = Number((-75.5774 + sampleCount * 0.00012 + Math.random() * 0.00005).toFixed(7));

    const sensorStatus = nextBattery <= 25 ? 'ATENCION' : sampleCount % 2 === 0 ? 'OK' : 'ESTABLE';
    const payloadStatus = serviceLog.device.type === 'DRONE' ? 'Grabacion en curso' : 'Entrega en curso';
    const nextStatus = nextBattery <= BATTERY_LOW_THRESHOLD ? DeviceStatus.MAINTENANCE : DeviceStatus.IN_SERVICE;
    let reservationAuditLog:
      | {
          reservation: { id: number; deviceId: number; operatorId: number };
          action: string;
          description: string;
        }
      | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.telemetrySample.create({
        data: {
          batteryLevel: nextBattery,
          latitude,
          longitude,
          sensorStatus,
          payloadStatus,
          deviceId: serviceLog.deviceId,
          serviceLogId: serviceLog.id,
        },
      });

      await tx.device.update({
        where: { id: serviceLog.deviceId },
        data: {
          batteryLevel: nextBattery,
          lastKnownLocation: serviceLog.device.type === 'DRONE' ? 'Zona abierta de cobertura' : 'Corredor administrativo',
          status: nextStatus,
        },
      });

      const finishedAt = new Date();
      const elapsedMs = finishedAt.getTime() - new Date(serviceLog.startTime).getTime();

      if (nextBattery <= BATTERY_LOW_THRESHOLD) {
        await tx.serviceLog.update({
          where: { id: serviceLog.id },
          data: {
            endTime: finishedAt,
            active: false,
            serviceStatus: ServiceStatus.ABORTED,
            orderStatus: 'Suspendido',
            notes: `${serviceLog.notes ?? 'Servicio automatico'} | Suspendido por bateria baja`,
          },
        });

        if (serviceLog.reservationId) {
          await tx.reservation.update({
            where: { id: serviceLog.reservationId },
            data: {
              status: ReservationStatus.CANCELLED,
              active: false,
            },
          });

          reservationAuditLog = {
            reservation: {
              id: serviceLog.reservationId,
              deviceId: serviceLog.deviceId,
              operatorId: serviceLog.operatorId,
            },
            action: 'CAMBIAR_ESTADO',
            description: `La simulacion cambio la reserva #${serviceLog.reservationId} a CANCELLED por bateria baja.`,
          };
        }

        return;
      }

      if (elapsedMs >= DEMO_SERVICE_DURATION_MS) {

        await tx.serviceLog.update({
          where: { id: serviceLog.id },
          data: {
            endTime: finishedAt,
            serviceStatus: ServiceStatus.COMPLETED,
            sensorSummary: 'Telemetria completa y video archivado en nube demo',
            orderStatus: 'Finalizado',
            notes: `${serviceLog.notes ?? 'Servicio automatico'} | Finalizado por el simulador`,
          },
        });

        if (serviceLog.reservationId) {
          await tx.reservation.update({
            where: { id: serviceLog.reservationId },
            data: { status: ReservationStatus.COMPLETED },
          });

          reservationAuditLog = {
            reservation: {
              id: serviceLog.reservationId,
              deviceId: serviceLog.deviceId,
              operatorId: serviceLog.operatorId,
            },
            action: 'CAMBIAR_ESTADO',
            description: `La simulacion cambio la reserva #${serviceLog.reservationId} a COMPLETED al finalizar el servicio.`,
          };
        }

        const cloudUrl = this.cloudService.buildVideoUrl(serviceLog.id);

        await tx.videoRecord.create({
          data: {
            cloudProvider: 'MOCK_CLOUD',
            cloudUrl,
            startedAt: serviceLog.startTime,
            endedAt: finishedAt,
            deviceId: serviceLog.deviceId,
            serviceLogId: serviceLog.id,
          },
        });

        await tx.device.update({
          where: { id: serviceLog.deviceId },
          data: {
            status: nextBattery <= BATTERY_LOW_THRESHOLD ? DeviceStatus.MAINTENANCE : DeviceStatus.AVAILABLE,
          },
        });
      }
    });

    if (reservationAuditLog) {
      await this.reservationsService.recordAuditLog(reservationAuditLog);
    }
  }

  private async appendMaintenanceTelemetry(device: { id: number; batteryLevel: number }) {
    const nextBattery = Math.min(100, device.batteryLevel + BATTERY_RECOVERY_STEP);
    const sensorStatus = nextBattery >= BATTERY_RECOVERY_THRESHOLD ? 'LISTO' : 'RECUPERANDO';

    await this.prisma.$transaction(async (tx) => {
      await tx.telemetrySample.create({
        data: {
          batteryLevel: nextBattery,
          latitude: -6.2591,
          longitude: -75.5772,
          sensorStatus,
          payloadStatus: 'Mantenimiento en curso',
          deviceId: device.id,
        },
      });

      await tx.device.update({
        where: { id: device.id },
        data: {
          batteryLevel: nextBattery,
          lastKnownLocation: 'Taller de mantenimiento',
          status: nextBattery >= BATTERY_RECOVERY_THRESHOLD ? DeviceStatus.AVAILABLE : DeviceStatus.MAINTENANCE,
        },
      });
    });
  }
}