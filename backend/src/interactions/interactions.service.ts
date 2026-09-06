import { Injectable } from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    private prisma: PrismaService,
    private customersService: CustomersService,
  ) {}

  async create(tenantId: string, userId: string, customerId: string, dto: CreateInteractionDto) {
    await this.customersService.findOne(tenantId, customerId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const interaction = await tx.interaction.create({
        data: {
          tenantId,
          customerId,
          type: dto.type,
          notes: dto.notes,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
          createdBy: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'interaction.created',
          entityType: 'interaction',
          entityId: interaction.id,
          metadata: { customerId, type: dto.type },
        },
      });
      return interaction;
    });
  }

  async findAllForCustomer(tenantId: string, customerId: string) {
    await this.customersService.findOne(tenantId, customerId);
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.interaction.findMany({ where: { customerId }, orderBy: { occurredAt: 'desc' } }),
    );
  }
}
