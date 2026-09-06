import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePointsConfigDto } from './dto/update-points-config.dto';

@Injectable()
export class PointsConfigService {
  constructor(private prisma: PrismaService) {}

  findOne(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) => tx.pointsConfig.findUniqueOrThrow({ where: { tenantId } }));
  }

  update(tenantId: string, dto: UpdatePointsConfigDto) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.pointsConfig.update({
        where: { tenantId },
        data: {
          pointsPerCurrencyUnit: dto.pointsPerCurrencyUnit,
          minPurchaseAmount: dto.minPurchaseAmount,
        },
      }),
    );
  }
}
