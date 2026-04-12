import { DeviceStatus, DeviceType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(DeviceType)
  type!: DeviceType;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  batteryLevel?: number;

  @IsString()
  @IsOptional()
  lastKnownLocation?: string;
}
