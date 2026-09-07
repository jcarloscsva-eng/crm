import { Injectable, NotFoundException } from '@nestjs/common';
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
      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productById = new Map(products.map((p) => [p.id, p]));

      const lines = dto.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Producto ${item.productId} no encontrado`);
        }
        const unitPrice = item.unitPrice ?? Number(product.price);
        const subtotal = Math.round(item.quantity * unitPrice * 100) / 100;
        return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal };
      });

      const total = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;

      const pointsConfig = await tx.pointsConfig.findUniqueOrThrow({ where: { tenantId } });
      const minPurchaseAmount = Number(pointsConfig.minPurchaseAmount);
      const pointsPerCurrencyUnit = Number(pointsConfig.pointsPerCurrencyUnit);
      const pointsEarned = total >= minPurchaseAmount ? Math.round(total * pointsPerCurrencyUnit * 100) / 100 : 0;

      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          customerId,
          amount: total,
          pointsEarned,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
          createdBy: userId,
        },
      });

      await Promise.all(
        lines.map((line) =>
          tx.purchaseItem.create({
            data: {
              tenantId,
              purchaseId: purchase.id,
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              subtotal: line.subtotal,
            },
          }),
        ),
      );

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
          metadata: { customerId, amount: total, pointsEarned, items: lines },
        },
      });

      return tx.purchase.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { items: { include: { product: true } }, returns: true },
      });
    });
  }

  async findAllForCustomer(tenantId: string, customerId: string) {
    await this.customersService.findOne(tenantId, customerId);
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.purchase.findMany({
        where: { customerId },
        include: { items: { include: { product: true } }, returns: true },
        orderBy: { occurredAt: 'desc' },
      }),
    );
  }
}
