import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewSegmentDto } from './dto/preview-segment.dto';
import { SaveSegmentDto } from './dto/save-segment.dto';
import { SegmentConditionDto } from './dto/segment-condition.dto';
import { FIELD_DEFINITIONS, FieldKey, NumericOperator, operatorsFor } from './field-catalog';

interface CustomerFactsRow {
  id: string;
  fullName: string;
  visits_count: number;
  calls_count: number;
  total_spend: number;
  avg_spend_per_visit: number | null;
  points_balance: number;
  days_since_last_visit: number;
  days_since_last_purchase: number;
  customer_age_days: number;
}

const NUMERIC_SQL_OPERATORS: Partial<Record<NumericOperator, string>> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
};

function buildCondition(cond: SegmentConditionDto, periodDays: number): Prisma.Sql {
  const def = FIELD_DEFINITIONS[cond.field as FieldKey];
  if (!def) {
    throw new BadRequestException(`Campo desconocido: ${cond.field}`);
  }
  if (!operatorsFor(cond.field).includes(cond.operator)) {
    throw new BadRequestException(`El campo "${cond.field}" no admite el operador "${cond.operator}"`);
  }

  if (cond.field === 'purchased_category') {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM purchase_items pi
      JOIN purchases pu ON pu.id = pi.purchase_id AND pu.customer_id = cf.id
      JOIN products prod ON prod.id = pi.product_id
      WHERE pu.occurred_at >= now() - (${periodDays} || ' days')::interval
        AND prod.category = ${cond.value}
    )`;
  }

  const column = def.column!;
  const value = Number(cond.value);
  if (!Number.isFinite(value)) {
    throw new BadRequestException(`Valor numérico inválido para "${cond.field}": "${cond.value}"`);
  }

  if (cond.operator === 'between') {
    const value2 = Number(cond.value2);
    if (!Number.isFinite(value2)) {
      throw new BadRequestException(`El operador "between" requiere un "value2" numérico para "${cond.field}"`);
    }
    return Prisma.sql`cf.${Prisma.raw(column)} BETWEEN ${value} AND ${value2}`;
  }

  const opSymbol = NUMERIC_SQL_OPERATORS[cond.operator as NumericOperator];
  if (!opSymbol) {
    throw new BadRequestException(`Operador no soportado: ${cond.operator}`);
  }
  return Prisma.sql`cf.${Prisma.raw(column)} ${Prisma.raw(opSymbol)} ${value}`;
}

@Injectable()
export class CustomSegmentsService {
  constructor(private prisma: PrismaService) {}

  fields() {
    return Object.entries(FIELD_DEFINITIONS).map(([key, def]) => ({
      key,
      label: def.label,
      type: def.type,
      periodAware: def.periodAware,
      operators: operatorsFor(key as FieldKey),
    }));
  }

  async preview(tenantId: string, dto: PreviewSegmentDto) {
    const periodDays = dto.periodDays ?? 90;
    const conditionFragments = dto.conditions.map((c) => buildCondition(c, periodDays));
    const combined = Prisma.join(
      conditionFragments.map((c) => Prisma.sql`(${c})`),
      dto.matchType === 'all' ? ' AND ' : ' OR ',
    );

    const rows = await this.prisma.withTenant(tenantId, (tx) =>
      tx.$queryRaw<CustomerFactsRow[]>(Prisma.sql`
        WITH visit_stats AS (
          SELECT customer_id, COUNT(*) AS visits_count
          FROM interactions
          WHERE type = 'visit' AND occurred_at >= now() - (${periodDays} || ' days')::interval
          GROUP BY customer_id
        ),
        call_stats AS (
          SELECT customer_id, COUNT(*) AS calls_count
          FROM interactions
          WHERE type = 'call' AND occurred_at >= now() - (${periodDays} || ' days')::interval
          GROUP BY customer_id
        ),
        purchase_stats AS (
          SELECT customer_id, COALESCE(SUM(amount), 0) AS total_spend
          FROM purchases
          WHERE occurred_at >= now() - (${periodDays} || ' days')::interval
          GROUP BY customer_id
        ),
        last_visit_ever AS (
          SELECT customer_id, MAX(occurred_at) AS last_visit_at FROM interactions WHERE type = 'visit' GROUP BY customer_id
        ),
        last_purchase_ever AS (
          SELECT customer_id, MAX(occurred_at) AS last_purchase_at FROM purchases GROUP BY customer_id
        ),
        customer_facts AS (
          SELECT
            c.id,
            c.full_name AS "fullName",
            COALESCE(vs.visits_count, 0)::int AS visits_count,
            COALESCE(cs.calls_count, 0)::int AS calls_count,
            COALESCE(ps.total_spend, 0)::float8 AS total_spend,
            (CASE WHEN COALESCE(vs.visits_count, 0) > 0
              THEN COALESCE(ps.total_spend, 0) / vs.visits_count
              ELSE NULL END)::float8 AS avg_spend_per_visit,
            c.points_balance::float8 AS points_balance,
            -- Un cliente que nunca visitó/compró se trata como "hace muchísimo
            -- tiempo" (no como "desconocido"), para que aparezca en filtros de
            -- inactividad tipo "sin visitar hace más de N días".
            COALESCE(EXTRACT(DAY FROM now() - lve.last_visit_at)::int, 999999) AS days_since_last_visit,
            COALESCE(EXTRACT(DAY FROM now() - lpe.last_purchase_at)::int, 999999) AS days_since_last_purchase,
            EXTRACT(DAY FROM now() - c.created_at)::int AS customer_age_days
          FROM customers c
          LEFT JOIN visit_stats vs ON vs.customer_id = c.id
          LEFT JOIN call_stats cs ON cs.customer_id = c.id
          LEFT JOIN purchase_stats ps ON ps.customer_id = c.id
          LEFT JOIN last_visit_ever lve ON lve.customer_id = c.id
          LEFT JOIN last_purchase_ever lpe ON lpe.customer_id = c.id
          WHERE c.deleted_at IS NULL
        )
        SELECT * FROM customer_facts cf
        WHERE ${combined}
        ORDER BY cf."fullName"
      `),
    );

    return rows;
  }

  async create(tenantId: string, userId: string, dto: SaveSegmentDto) {
    // Se valida construyendo la consulta una vez antes de guardar: un
    // nombre guardado con condiciones inválidas no sirve de nada.
    await this.preview(tenantId, dto);

    return this.prisma.withTenant(tenantId, (tx) =>
      tx.savedSegment.create({
        data: {
          tenantId,
          name: dto.name,
          periodDays: dto.periodDays ?? 90,
          matchType: dto.matchType,
          conditions: dto.conditions as unknown as Prisma.InputJsonValue,
          createdBy: userId,
        },
      }),
    );
  }

  list(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) => tx.savedSegment.findMany({ orderBy: { createdAt: 'desc' } }));
  }

  async getResults(tenantId: string, id: string) {
    const saved = await this.prisma.withTenant(tenantId, (tx) => tx.savedSegment.findUnique({ where: { id } }));
    if (!saved) {
      throw new NotFoundException('Segmento no encontrado');
    }
    const results = await this.preview(tenantId, {
      periodDays: saved.periodDays,
      matchType: saved.matchType as 'all' | 'any',
      conditions: saved.conditions as unknown as SegmentConditionDto[],
    });
    return { segment: saved, results };
  }

  async remove(tenantId: string, id: string) {
    const saved = await this.prisma.withTenant(tenantId, (tx) => tx.savedSegment.findUnique({ where: { id } }));
    if (!saved) {
      throw new NotFoundException('Segmento no encontrado');
    }
    await this.prisma.withTenant(tenantId, (tx) => tx.savedSegment.delete({ where: { id } }));
    return { id };
  }
}
