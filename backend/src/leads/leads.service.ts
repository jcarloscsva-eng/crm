import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, userId: string, dto: CreateLeadDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.lead.create({
        data: {
          tenantId,
          fullName: dto.fullName,
          company: dto.company,
          email: dto.email,
          phone: dto.phone,
          linkedinUrl: dto.linkedinUrl,
          estimatedValue: dto.estimatedValue,
          notes: dto.notes,
          source: dto.source ?? 'manual',
          createdBy: userId,
        },
      }),
    );
  }

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) => tx.lead.findMany({ orderBy: { createdAt: 'desc' } }));
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.withTenant(tenantId, (tx) => tx.lead.findUnique({ where: { id } }));
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, (tx) => tx.lead.update({ where: { id }, data: dto }));
  }

  async updateStage(tenantId: string, id: string, dto: UpdateLeadStageDto) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, (tx) => tx.lead.update({ where: { id }, data: { stage: dto.stage } }));
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.withTenant(tenantId, (tx) => tx.lead.delete({ where: { id } }));
    return { id };
  }

  /**
   * Convierte un lead en un cliente real (con su propio historial de
   * compras y puntos, que un lead nunca tiene). El lead pasa a "won" y
   * queda enlazado al cliente creado — no se borra, para conservar de
   * dónde vino ese cliente.
   */
  async convertToCustomer(tenantId: string, userId: string, id: string) {
    const lead = await this.findOne(tenantId, id);
    if (lead.convertedCustomerId) {
      throw new BadRequestException('Este lead ya se convirtió en cliente');
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId,
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          customFields: lead.company ? { company: lead.company } : {},
        },
      });
      const updatedLead = await tx.lead.update({
        where: { id },
        data: { stage: 'won', convertedCustomerId: customer.id },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'lead.converted',
          entityType: 'lead',
          entityId: lead.id,
          metadata: { customerId: customer.id },
        },
      });
      return { lead: updatedLead, customer };
    });
  }
}
