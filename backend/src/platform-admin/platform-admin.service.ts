import { ConflictException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlatformAdminLoginDto } from './dto/platform-admin-login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Siembra (o actualiza) la única cuenta de administrador de la plataforma
   * a partir de variables de entorno cada vez que arranca el servidor. No
   * existe ningún endpoint público para crear administradores de plataforma
   * — deliberadamente, es la cuenta más privilegiada del sistema (puede
   * crear negocios nuevos).
   */
  async onModuleInit() {
    const email = this.config.get<string>('PLATFORM_ADMIN_EMAIL');
    const password = this.config.get<string>('PLATFORM_ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD no configurados: no se sembró ningún administrador de plataforma.',
      );
      return;
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.platformAdmin.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    this.logger.log(`Administrador de plataforma listo: ${email}`);
  }

  async login(dto: PlatformAdminLoginDto) {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { email: dto.email } });
    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const passwordMatches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const accessToken = this.jwt.sign(
      { sub: admin.id, email: admin.email, scope: 'platform_admin' },
      { secret: this.config.get<string>('PLATFORM_ADMIN_JWT_SECRET'), expiresIn: '8h' },
    );
    return { accessToken, admin: { id: admin.id, email: admin.email } };
  }

  async createTenant(dto: CreateTenantDto) {
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

      return {
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, businessType: tenant.businessType },
        owner: { id: user.id, email: user.email },
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('El slug del negocio o el email ya están en uso');
      }
      throw err;
    }
  }

  async listTenants() {
    // La tabla tenants tiene lectura pública (política RLS "USING (true)"),
    // así que esta consulta no necesita contexto de ningún tenant concreto.
    const tenants = await this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });

    // Pero users/customers SÍ tienen RLS: contarlos con un $count global
    // (sin fijar tenant) devolvería 0 siempre, no un dato real — no es que
    // falle, es que mentiría. Por eso se cuenta tenant por tenant, cada uno
    // con su propio contexto RLS fijado. Con pocos negocios (el caso de una
    // pyme) esto es barato; si esta lista creciera mucho, convendría una
    // vista materializada en vez de N transacciones.
    return Promise.all(
      tenants.map(async (t) => {
        const [userCount, customerCount] = await this.prisma.withTenant(t.id, (tx) =>
          Promise.all([tx.user.count(), tx.customer.count({ where: { deletedAt: null } })]),
        );
        return {
          id: t.id,
          slug: t.slug,
          name: t.name,
          businessType: t.businessType,
          createdAt: t.createdAt,
          userCount,
          customerCount,
        };
      }),
    );
  }
}
