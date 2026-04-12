import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const reservationStatuses = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

type ReservationStatus = (typeof reservationStatuses)[number];

export class UpdateReservationDto {
  @IsString()
  @IsOptional()
  object?: string;

  @IsString()
  @IsOptional()
  device?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startAt?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endAt?: Date;

  @IsInt()
  @IsOptional()
  deviceId?: number;

  @IsInt()
  @IsOptional()
  operatorId?: number;

  @IsString()
  @IsOptional()
  email?: string;

  @IsIn(reservationStatuses)
  @IsOptional()
  status?: ReservationStatus;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
