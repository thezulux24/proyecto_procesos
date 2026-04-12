import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const serviceStatuses = ['IN_PROGRESS', 'COMPLETED', 'ABORTED'] as const;

type ServiceStatus = (typeof serviceStatuses)[number];

export class CreateServiceLogDto {
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endTime?: Date;

  @IsString()
  origin!: string;

  @IsString()
  destination!: string;

  @IsInt()
  deviceId!: number;

  @IsInt()
  operatorId!: number;

  @IsInt()
  @IsOptional()
  reservationId?: number;

  @IsIn(serviceStatuses)
  @IsOptional()
  serviceStatus?: ServiceStatus;

  @IsString()
  @IsOptional()
  sensorSummary?: string;

  @IsString()
  @IsOptional()
  orderStatus?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
