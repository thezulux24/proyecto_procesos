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
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OPERADOR')
  @Get()
  findAll(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.reservationsService.findAll(includeInactive);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OPERADOR')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('OPERADOR')
  @Post()
  create(@Body() body: CreateReservationDto) {
    return this.reservationsService.create(body);
  }

  @UseGuards(RolesGuard)
  @Roles('OPERADOR')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateReservationDto) {
    return this.reservationsService.update(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }
}
