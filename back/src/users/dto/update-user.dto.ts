import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const roles = ['ADMIN', 'OPERADOR'] as const;
type AppRole = (typeof roles)[number];

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsIn(roles)
  @IsOptional()
  role?: AppRole;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
