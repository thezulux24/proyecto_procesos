import { Injectable, MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeviceStatus, Prisma, ReservationStatus, ServiceStatus } from '@prisma/client';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { CloudService } from '../cloud/cloud.service';

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

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly snapshotSubject = new Subject<DashboardOverview>();
  private demoTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudService: CloudService,
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
    const activeService = await this.prisma.serviceLog.findFirst({
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
    });

    const service = activeService ?? (await this.bootstrapDemoService());

    if (!service) {
      await this.publishSnapshot();
      return;
    }

    await this.appendTelemetry(service);
    await this.publishSnapshot();
  }

  private async bootstrapDemoService(): Promise<ServiceLogWithRelations | null> {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        active: true,
        status: {
          in: [ReservationStatus.ACCEPTED, ReservationStatus.REQUESTED],
        },
      },
      include: {
        device: true,
        operator: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    if (reservation && reservation.device && reservation.operator) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.IN_PROGRESS },
        });

        await tx.device.update({
          where: { id: reservation.deviceId },
          data: { status: DeviceStatus.IN_SERVICE },
        });

        await tx.serviceLog.create({
          data: {
            startTime: new Date(),
            origin: reservation.device.type === 'DRONE' ? 'Hangar Norte' : 'Bloque Administrativo',
            destination: reservation.device.type === 'DRONE' ? 'Cobertura en curso' : 'Entrega en curso',
            serviceStatus: ServiceStatus.IN_PROGRESS,
            sensorSummary: 'Simulacion automatica inicializada',
            orderStatus: 'En proceso',
            notes: 'Servicio levantado automaticamente para el demo',
            deviceId: reservation.deviceId,
            operatorId: reservation.operatorId,
            reservationId: reservation.id,
          },
        });
      });

      return this.prisma.serviceLog.findFirst({
        where: {
          reservationId: reservation.id,
          active: true,
          serviceStatus: ServiceStatus.IN_PROGRESS,
        },
        include: {
          device: true,
          operator: true,
          reservation: true,
          telemetrySamples: true,
          videos: true,
        },
      });
    }

    const device = await this.prisma.device.findFirst({
      where: {
        active: true,
        status: DeviceStatus.AVAILABLE,
      },
      orderBy: { updatedAt: 'asc' },
    });

    const operator = await this.prisma.operator.findFirst({
      where: { active: true },
      orderBy: { updatedAt: 'asc' },
    });

    if (!device || !operator) {
      return null;
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.IN_SERVICE },
    });

    return this.prisma.serviceLog.create({
      data: {
        startTime: new Date(),
        origin: 'Campus central',
        destination: device.type === 'DRONE' ? 'Cobertura demo' : 'Ruta demo',
        serviceStatus: ServiceStatus.IN_PROGRESS,
        sensorSummary: 'Simulacion automatica inicializada',
        orderStatus: 'En proceso',
        notes: 'Servicio sin reserva creado para el demo',
        deviceId: device.id,
        operatorId: operator.id,
      },
      include: {
        device: true,
        operator: true,
        reservation: true,
        telemetrySamples: true,
        videos: true,
      },
    });
  }

  private async appendTelemetry(serviceLog: ServiceLogWithRelations) {
    if (!serviceLog.device) {
      return;
    }

    const sampleCount = serviceLog.telemetrySamples.length;
    const nextBattery = Math.max(10, serviceLog.device.batteryLevel - (sampleCount >= 3 ? 6 : 3));
    const latitude = Number((-6.2589 + sampleCount * 0.00018 + Math.random() * 0.00005).toFixed(7));
    const longitude = Number((-75.5774 + sampleCount * 0.00012 + Math.random() * 0.00005).toFixed(7));

    const sensorStatus = nextBattery <= 25 ? 'ATENCION' : sampleCount % 2 === 0 ? 'OK' : 'ESTABLE';
    const payloadStatus = serviceLog.device.type === 'DRONE' ? 'Grabacion en curso' : 'Entrega en curso';

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
          status: nextBattery <= 25 ? DeviceStatus.MAINTENANCE : DeviceStatus.IN_SERVICE,
        },
      });

      if (nextBattery <= 25 || sampleCount >= 4) {
        const finishedAt = new Date();

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
          data: { status: DeviceStatus.AVAILABLE },
        });
      }
    });
  }
}