import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactCategoryValue } from './dto/create-contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, userId: string, dto: CreateContactDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.contact.create({
        data: {
          tenantId,
          category: dto.category,
          fullName: dto.fullName,
          company: dto.company,
          email: dto.email,
          phone: dto.phone,
          linkedinUrl: dto.linkedinUrl,
          notes: dto.notes,
          source: dto.source ?? 'manual',
          createdBy: userId,
        },
      }),
    );
  }

  findAll(tenantId: string, category?: ContactCategoryValue) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.contact.findMany({
        where: category ? { category } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.withTenant(tenantId, (tx) => tx.contact.findUnique({ where: { id } }));
    if (!contact) {
      throw new NotFoundException('Contacto no encontrado');
    }
    return contact;
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, (tx) => tx.contact.update({ where: { id }, data: dto }));
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.withTenant(tenantId, (tx) => tx.contact.delete({ where: { id } }));
    return { id };
  }
}
