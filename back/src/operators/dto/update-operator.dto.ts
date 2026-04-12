import { OperatorRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOperatorDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(OperatorRole)
  @IsOptional()
  role?: OperatorRole;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
