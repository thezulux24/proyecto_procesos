import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';

type AuthUser = Prisma.UserGetPayload<{ include: { role: true } }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.active || !user.role || !user.role.active) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roleName = user.role?.nombre;
    if (!roleName) {
      throw new UnauthorizedException('User role not assigned');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: roleName,
      fullName: user.fullName,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: roleName,
      },
    };
  }

  async validateToken(payload: any): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.active || !user.role || !user.role.active) {
      return null;
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  generatePasswordResetToken(user: { id: number; email: string; fullName: string }) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        purpose: 'password-reset',
      },
      { expiresIn: '48h' },
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let payload: { sub?: number; email?: string; purpose?: string };

    try {
      payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });
    } catch {
      throw new BadRequestException('Token de restablecimiento invalido o expirado');
    }

    if (!payload.sub || payload.purpose !== 'password-reset') {
      throw new BadRequestException('Token de restablecimiento invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.active || !user.role || !user.role.active) {
      throw new BadRequestException('Usuario no disponible para restablecer contraseña');
    }

    const passwordHash = await this.hashPassword(resetPasswordDto.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
