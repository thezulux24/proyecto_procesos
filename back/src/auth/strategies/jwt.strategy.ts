import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

function extractToken(request: any) {
  const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  if (bearerToken) {
    return bearerToken;
  }

  if (typeof request?.query?.token === 'string' && request.query.token.trim()) {
    return request.query.token;
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: extractToken,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateToken(payload);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const roleName = user.role?.nombre;
    if (!roleName) {
      throw new UnauthorizedException('User role not assigned');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: roleName,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
