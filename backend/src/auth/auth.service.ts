import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const tenantId = randomUUID();
    const passwordHash = await bcrypt.hash(dto.ownerPassword, BCRYPT_ROUNDS);

    try {
      const { tenant, user } = await this.prisma.withTenant(tenantId, async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            id: tenantId,
            slug: dto.slug,
            name: dto.businessName,
            businessType: dto.businessType,
          },
        });
        const user = await tx.user.create({
          data: {
            tenantId,
            email: dto.ownerEmail,
            passwordHash,
            fullName: dto.ownerFullName,
            role: 'owner',
          },
        });
        await tx.pointsConfig.create({ data: { tenantId } });
        return { tenant, user };
      });

      return this.issueToken({ userId: user.id, tenantId: tenant.id, email: user.email, role: user.role }, tenant);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('El slug del negocio o el email ya están en uso');
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    // La tabla tenants tiene lectura pública (no contiene datos de clientes),
    // así que esta búsqueda no necesita contexto de tenant todavía.
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (!tenant) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email: dto.email } } }),
    );
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueToken({ userId: user.id, tenantId: tenant.id, email: user.email, role: user.role }, tenant);
  }

  private issueToken(
    payload: { userId: string; tenantId: string; email: string; role: string },
    tenant: { id: string; slug: string; name: string },
  ) {
    const accessToken = this.jwt.sign({
      sub: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    });
    return {
      accessToken,
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      user: { id: payload.userId, email: payload.email, role: payload.role },
    };
  }
}
