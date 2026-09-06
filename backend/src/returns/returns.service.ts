import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
  ) {}

  async create(tenantId: string, userId: string, customerId: string, purchaseId: string, dto: CreateReturnDto) {
    await this.customersService.findOne(tenantId, customerId);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, customerId },
        include: { returns: true },
      });
      if (!purchase) {
        throw new NotFoundException('Compra no encontrada');
      }

      const purchaseAmount = Number(purchase.amount);
      const alreadyReturned = purchase.returns.reduce((sum, r) => sum + Number(r.amount), 0);
      const remaining = Math.round((purchaseAmount - alreadyReturned) * 100) / 100;

      if (dto.amount > remaining) {
        throw new BadRequestException(
          `No se puede devolver ${dto.amount}: quedan ${remaining} disponibles de esta compra (ya devuelto: ${alreadyReturned})`,
        );
      }

      // Reversión proporcional: si se devuelve el 100% del importe, se revierten
      // todos los puntos ganados; si se devuelve una parte, se revierte esa
      // misma proporción de puntos.
      const pointsReversed =
        purchaseAmount > 0 ? Math.round((Number(purchase.pointsEarned) * (dto.amount / purchaseAmount)) * 100) / 100 : 0;

      const returnRecord = await tx.return.create({
        data: {
          tenantId,
          purchaseId,
          customerId,
          amount: dto.amount,
          pointsReversed,
          reason: dto.reason,
          createdBy: userId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { pointsBalance: { decrement: pointsReversed } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'return.created',
          entityType: 'return',
          entityId: returnRecord.id,
          metadata: { customerId, purchaseId, amount: dto.amount, pointsReversed },
        },
      });

      return returnRecord;
    });
  }

  async findAllForCustomer(tenantId: string, customerId: string) {
    await this.customersService.findOne(tenantId, customerId);
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.return.findMany({ where: { customerId }, orderBy: { occurredAt: 'desc' } }),
    );
  }
}
