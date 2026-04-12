import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const serviceStatuses = ['IN_PROGRESS', 'COMPLETED', 'ABORTED'] as const;

type ServiceStatus = (typeof serviceStatuses)[number];

export class UpdateServiceLogDto {
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startTime?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endTime?: Date;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsInt()
  @IsOptional()
  deviceId?: number;

  @IsInt()
  @IsOptional()
  operatorId?: number;

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

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
