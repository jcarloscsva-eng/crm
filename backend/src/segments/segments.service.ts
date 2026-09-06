import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CustomerPeriodStatsRow {
  id: string;
  fullName: string;
  visitsCurrentPeriod: number;
  visitsPreviousPeriod: number;
  spendCurrentPeriod: number;
  spendPreviousPeriod: number;
}

export interface SegmentCustomer {
  id: string;
  fullName: string;
  visitsCurrentPeriod: number;
  visitsPreviousPeriod: number;
  avgSpendCurrentPeriod: number | null;
  avgSpendPreviousPeriod: number | null;
}

const PERIOD_MONTHS = 12;

@Injectable()
export class SegmentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Definición de "periodo actual" y "periodo anterior": los últimos 12 meses
   * frente a los 12 meses anteriores a esos (una ventana de 24 meses partida
   * en dos). Es una elección razonable para "el último año", pero es una
   * definición nuestra, no un estándar — documentada aquí para que quede
   * explícita.
   *
   * "Gasto medio por visita" en este CRM = (total comprado en el periodo) /
   * (número de visitas registradas en el periodo). No se exige que cada
   * compra esté ligada a una visita concreta (el esquema no las relaciona
   * 1 a 1), así que es una media agregada del periodo, no un promedio por
   * ticket individual.
   */
  async compute(tenantId: string) {
    const rows = await this.prisma.withTenant(tenantId, (tx) =>
      tx.$queryRaw<CustomerPeriodStatsRow[]>(Prisma.sql`
        WITH visit_stats AS (
          SELECT
            customer_id,
            COUNT(*) FILTER (WHERE occurred_at >= now() - interval '${Prisma.raw(String(PERIOD_MONTHS))} months') AS visits_current,
            COUNT(*) FILTER (
              WHERE occurred_at >= now() - interval '${Prisma.raw(String(PERIOD_MONTHS * 2))} months'
                AND occurred_at < now() - interval '${Prisma.raw(String(PERIOD_MONTHS))} months'
            ) AS visits_previous
          FROM interactions
          WHERE type = 'visit'
          GROUP BY customer_id
        ),
        purchase_stats AS (
          SELECT
            customer_id,
            COALESCE(SUM(amount) FILTER (WHERE occurred_at >= now() - interval '${Prisma.raw(String(PERIOD_MONTHS))} months'), 0) AS spend_current,
            COALESCE(SUM(amount) FILTER (
              WHERE occurred_at >= now() - interval '${Prisma.raw(String(PERIOD_MONTHS * 2))} months'
                AND occurred_at < now() - interval '${Prisma.raw(String(PERIOD_MONTHS))} months'
            ), 0) AS spend_previous
          FROM purchases
          GROUP BY customer_id
        )
        SELECT
          c.id,
          c.full_name AS "fullName",
          COALESCE(vs.visits_current, 0)::int AS "visitsCurrentPeriod",
          COALESCE(vs.visits_previous, 0)::int AS "visitsPreviousPeriod",
          COALESCE(ps.spend_current, 0)::float8 AS "spendCurrentPeriod",
          COALESCE(ps.spend_previous, 0)::float8 AS "spendPreviousPeriod"
        FROM customers c
        LEFT JOIN visit_stats vs ON vs.customer_id = c.id
        LEFT JOIN purchase_stats ps ON ps.customer_id = c.id
        WHERE c.deleted_at IS NULL
      `),
    );

    const withAverages: SegmentCustomer[] = rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      visitsCurrentPeriod: r.visitsCurrentPeriod,
      visitsPreviousPeriod: r.visitsPreviousPeriod,
      avgSpendCurrentPeriod: r.visitsCurrentPeriod > 0 ? r.spendCurrentPeriod / r.visitsCurrentPeriod : null,
      avgSpendPreviousPeriod: r.visitsPreviousPeriod > 0 ? r.spendPreviousPeriod / r.visitsPreviousPeriod : null,
    }));

    return {
      periodMonths: PERIOD_MONTHS,
      visitsDecreased: withAverages.filter((c) => c.visitsCurrentPeriod < c.visitsPreviousPeriod),
      avgSpendIncreased: withAverages.filter(
        (c) =>
          c.avgSpendCurrentPeriod !== null &&
          c.avgSpendPreviousPeriod !== null &&
          c.avgSpendCurrentPeriod > c.avgSpendPreviousPeriod,
      ),
      avgSpendDecreased: withAverages.filter(
        (c) =>
          c.avgSpendCurrentPeriod !== null &&
          c.avgSpendPreviousPeriod !== null &&
          c.avgSpendCurrentPeriod < c.avgSpendPreviousPeriod,
      ),
    };
  }
}
