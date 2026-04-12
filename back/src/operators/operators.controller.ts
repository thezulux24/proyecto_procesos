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
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('operators')
@UseGuards(JwtAuthGuard)
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  findAll(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.operatorsService.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.operatorsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() body: CreateOperatorDto) {
    return this.operatorsService.create(body);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOperatorDto) {
    return this.operatorsService.update(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.operatorsService.remove(id);
  }
}
