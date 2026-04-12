import { DeviceStatus, DeviceType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

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

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
