import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ServiceLogsService } from './service-logs.service';
import { CreateServiceLogDto } from './dto/create-service-log.dto';
import { UpdateServiceLogDto } from './dto/update-service-log.dto';

@Controller('service-logs')
export class ServiceLogsController {
  constructor(private readonly serviceLogsService: ServiceLogsService) {}

  @Get()
  findAll(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.serviceLogsService.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceLogsService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateServiceLogDto) {
    return this.serviceLogsService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateServiceLogDto) {
    return this.serviceLogsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceLogsService.remove(id);
  }
}
