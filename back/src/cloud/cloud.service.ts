import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CloudService {
  constructor(private readonly prisma: PrismaService) {}

  buildVideoUrl(serviceLogId: number) {
    const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:3001';
    return `${baseUrl}/cloud/videos/service-logs/${serviceLogId}`;
  }

  async findVideoManifest(serviceLogId: number) {
    const video = await this.prisma.videoRecord.findFirst({
      where: { serviceLogId },
      orderBy: { createdAt: 'desc' },
      include: {
        device: true,
        serviceLog: {
          include: {
            device: true,
            operator: true,
            reservation: true,
            telemetrySamples: {
              orderBy: { recordedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException(`Video artifact for service log ${serviceLogId} not found`);
    }

    return video;
  }
}