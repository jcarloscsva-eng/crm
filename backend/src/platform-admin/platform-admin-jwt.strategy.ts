import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface PlatformAdminJwtPayload {
  sub: string;
  email: string;
  scope: 'platform_admin';
}

export interface AuthenticatedPlatformAdmin {
  adminId: string;
  email: string;
}

/**
 * Estrategia separada de la de usuarios de negocio (JwtStrategy), con su
 * propio nombre ('platform-admin-jwt') y su propio secreto de firma
 * (PLATFORM_ADMIN_JWT_SECRET). Es defensa en profundidad: aunque hubiera
 * un bug en los guards, un token de un empleado nunca podría validar
 * aquí (secreto distinto → falla la verificación de firma antes incluso
 * de mirar el contenido), y viceversa.
 */
@Injectable()
export class PlatformAdminJwtStrategy extends PassportStrategy(Strategy, 'platform-admin-jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('PLATFORM_ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error('PLATFORM_ADMIN_JWT_SECRET no está configurado');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: PlatformAdminJwtPayload): Promise<AuthenticatedPlatformAdmin> {
    if (!payload?.sub || payload.scope !== 'platform_admin') {
      throw new UnauthorizedException();
    }
    return { adminId: payload.sub, email: payload.email };
  }
}
