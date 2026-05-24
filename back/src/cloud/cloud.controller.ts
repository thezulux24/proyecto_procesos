import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CloudService } from './cloud.service';

@Controller('cloud')
export class CloudController {
  constructor(private readonly cloudService: CloudService) {}

  @Get('videos/service-logs/:serviceLogId')
  getVideoManifest(@Param('serviceLogId', ParseIntPipe) serviceLogId: number) {
    return this.cloudService.findVideoManifest(serviceLogId);
  }
}