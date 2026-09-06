import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Ejecuta `fn` dentro de una transacción con la variable de sesión de
   * Postgres "app.tenant_id" fijada al tenant activo. Las políticas RLS
   * definidas en la migración inicial usan esa variable para filtrar cada
   * fila: aunque un servicio olvide añadir "where tenant_id = ...", la
   * base de datos igualmente rechaza filas de otro negocio.
   *
   * Nunca uses `this.<modelo>` directamente para leer/escribir datos de un
   * tenant (customers, users, interactions, purchases, returns, audit_log,
   * points_config) fuera de este helper: sin la variable de sesión fijada,
   * las políticas RLS deniegan todo por defecto (fail-closed).
   */
  async withTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
