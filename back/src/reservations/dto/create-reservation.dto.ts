import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const reservationStatuses = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

type ReservationStatus = (typeof reservationStatuses)[number];

export class CreateReservationDto {
  @IsString()
  object!: string;

  @IsString()
  device!: string;

  @IsString()
  requestedBy!: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;

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
}
