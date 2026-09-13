import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, userId: string, dto: CreateCustomerDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          customFields: (dto.customFields ?? {}) as Prisma.InputJsonValue,
          consentMarketing: dto.consentMarketing ?? false,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'customer.created',
          entityType: 'customer',
          entityId: customer.id,
        },
      });
      return customer;
    });
  }

  findAll(tenantId: string, search?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.customer.findMany({
        where: {
          deletedAt: null,
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { phone: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.withTenant(tenantId, (tx) =>
      tx.customer.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: { ...dto, customFields: dto.customFields as Prisma.InputJsonValue | undefined },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'customer.updated',
          entityType: 'customer',
          entityId: customer.id,
          metadata: dto as any,
        },
      });
      return customer;
    });
  }

  /** Borrado lógico. */
  async softDelete(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'customer.deleted',
          entityType: 'customer',
          entityId: customer.id,
        },
      });
      return customer;
    });
  }

  findAllDeleted(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.customer.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      }),
    );
  }

  /** A diferencia de findOne, no excluye clientes ya borrados lógicamente. */
  private async findOneIncludingDeleted(tenantId: string, id: string) {
    const customer = await this.prisma.withTenant(tenantId, (tx) => tx.customer.findFirst({ where: { id } }));
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return customer;
  }

  /**
   * Derecho a la portabilidad (RGPD): todo lo que el CRM guarda sobre este
   * cliente, en un único documento. No excluye clientes ya borrados
   * lógicamente, porque una solicitud de portabilidad puede llegar antes de
   * pedir el borrado, o para conservar una copia justo antes de purgar.
   */
  async exportData(tenantId: string, id: string) {
    const customer = await this.findOneIncludingDeleted(tenantId, id);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [interactions, purchases, returns] = await Promise.all([
        tx.interaction.findMany({ where: { customerId: id }, orderBy: { occurredAt: 'asc' } }),
        tx.purchase.findMany({
          where: { customerId: id },
          include: { items: { include: { product: true } } },
          orderBy: { occurredAt: 'asc' },
        }),
        tx.return.findMany({ where: { customerId: id }, orderBy: { occurredAt: 'asc' } }),
      ]);
      return { exportedAt: new Date().toISOString(), customer, interactions, purchases, returns };
    });
  }

  /**
   * Borrado físico definitivo (derecho al olvido real). Exige que el
   * cliente ya esté borrado lógicamente: dos pasos deliberados en vez de
   * uno, para que una purga irreversible nunca sea el primer clic.
   *
   * interactions/purchases/purchase_items/returns caen en cascada (FK
   * ON DELETE CASCADE hacia customers). audit_log no referencia
   * customers por FK (entity_id es un UUID suelto), así que el historial
   * de auditoría persiste con normalidad tras la purga.
   */
  async purge(tenantId: string, userId: string, id: string) {
    const customer = await this.findOneIncludingDeleted(tenantId, id);
    if (!customer.deletedAt) {
      throw new BadRequestException(
        'Solo se puede purgar un cliente que ya esté borrado. Bórralo primero (DELETE /customers/:id).',
      );
    }
    return this.prisma.withTenant(tenantId, async (tx) => {
      await tx.auditLog.create({
        data: { tenantId, userId, action: 'customer.purged', entityType: 'customer', entityId: id },
      });
      await tx.customer.delete({ where: { id } });
      return { purged: true, id };
    });
  }
}
