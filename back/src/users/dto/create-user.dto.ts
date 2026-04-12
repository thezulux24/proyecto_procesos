import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

const roles = ['ADMIN', 'OPERADOR'] as const;
export type AppRole = (typeof roles)[number];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsIn(roles)
  role: AppRole = 'OPERADOR';
}
