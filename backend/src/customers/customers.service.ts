import { Injectable, NotFoundException } from '@nestjs/common';
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

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.customer.findMany({
        where: { deletedAt: null },
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

  /**
   * Borrado lógico: conserva el registro para trazabilidad de auditoría pero
   * lo excluye de toda lectura normal. El borrado físico definitivo (derecho
   * al olvido real) es una operación aparte, deliberadamente no expuesta
   * todavía por la API.
   */
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
}
