import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CustomerSpendRow {
  id: string;
  fullName: string;
  grossSpend: number;
  totalReturned: number;
  netSpend: number;
  pointsBalance: number;
}

interface ProductSalesRow {
  id: string;
  name: string;
  category: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

const TOP_N = 10;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async customers(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const [totalCustomers, newThisMonth, spendRows] = await Promise.all([
        tx.customer.count({ where: { deletedAt: null } }),
        tx.customer.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
        tx.$queryRaw<CustomerSpendRow[]>(Prisma.sql`
          WITH purchase_totals AS (
            SELECT customer_id, COALESCE(SUM(amount), 0) AS gross FROM purchases GROUP BY customer_id
          ),
          return_totals AS (
            SELECT customer_id, COALESCE(SUM(amount), 0) AS returned FROM returns GROUP BY customer_id
          )
          SELECT
            c.id,
            c.full_name AS "fullName",
            COALESCE(pt.gross, 0)::float8 AS "grossSpend",
            COALESCE(rt.returned, 0)::float8 AS "totalReturned",
            (COALESCE(pt.gross, 0) - COALESCE(rt.returned, 0))::float8 AS "netSpend",
            c.points_balance::float8 AS "pointsBalance"
          FROM customers c
          LEFT JOIN purchase_totals pt ON pt.customer_id = c.id
          LEFT JOIN return_totals rt ON rt.customer_id = c.id
          WHERE c.deleted_at IS NULL
        `),
      ]);

      const topBySpend = [...spendRows].sort((a, b) => b.netSpend - a.netSpend).slice(0, TOP_N);
      const topByPoints = [...spendRows].sort((a, b) => b.pointsBalance - a.pointsBalance).slice(0, TOP_N);

      return { totalCustomers, newThisMonth, topBySpend, topByPoints };
    });
  }

  async products(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const [totalActiveProducts, salesRows] = await Promise.all([
        tx.product.count({ where: { active: true } }),
        tx.$queryRaw<ProductSalesRow[]>(Prisma.sql`
          SELECT
            p.id,
            p.name,
            p.category,
            SUM(pi.quantity)::float8 AS "totalQuantity",
            SUM(pi.subtotal)::float8 AS "totalRevenue"
          FROM purchase_items pi
          JOIN products p ON p.id = pi.product_id
          GROUP BY p.id
        `),
      ]);

      const topByQuantity = [...salesRows].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, TOP_N);
      const topByRevenue = [...salesRows].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, TOP_N);

      return { totalActiveProducts, topByQuantity, topByRevenue };
    });
  }
}
