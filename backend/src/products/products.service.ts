import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.create({
        data: { tenantId, name: dto.name, category: dto.category, price: dto.price },
      }),
    );
  }

  findAll(tenantId: string, includeInactive: boolean) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findMany({
        where: includeInactive ? undefined : { active: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  update(tenantId: string, id: string, dto: UpdateProductDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.product.update({
        where: { id },
        data: { name: dto.name, category: dto.category, price: dto.price, active: dto.active },
      }),
    );
  }

  async categories(tenantId: string) {
    const rows = await this.prisma.withTenant(tenantId, (tx) =>
      tx.product.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    );
    return rows.map((r) => r.category!);
  }
}
