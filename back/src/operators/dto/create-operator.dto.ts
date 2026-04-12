import { OperatorRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsEnum(OperatorRole)
  @IsOptional()
  role?: OperatorRole;
}
