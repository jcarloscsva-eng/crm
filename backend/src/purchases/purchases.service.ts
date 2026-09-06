import { Injectable } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
  ) {}

  async create(tenantId: string, userId: string, customerId: string, dto: CreatePurchaseDto) {
    await this.customersService.findOne(tenantId, customerId);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const pointsConfig = await tx.pointsConfig.findUniqueOrThrow({ where: { tenantId } });

      const minPurchaseAmount = Number(pointsConfig.minPurchaseAmount);
      const pointsPerCurrencyUnit = Number(pointsConfig.pointsPerCurrencyUnit);
      const pointsEarned =
        dto.amount >= minPurchaseAmount ? Math.round(dto.amount * pointsPerCurrencyUnit * 100) / 100 : 0;

      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          customerId,
          amount: dto.amount,
          pointsEarned,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
          createdBy: userId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { pointsBalance: { increment: pointsEarned } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'purchase.created',
          entityType: 'purchase',
          entityId: purchase.id,
          metadata: { customerId, amount: dto.amount, pointsEarned },
        },
      });

      return purchase;
    });
  }

  async findAllForCustomer(tenantId: string, customerId: string) {
    await this.customersService.findOne(tenantId, customerId);
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.purchase.findMany({
        where: { customerId },
        include: { returns: true },
        orderBy: { occurredAt: 'desc' },
      }),
    );
  }
}
