export type FieldKey =
  | 'visits_count'
  | 'calls_count'
  | 'total_spend'
  | 'avg_spend_per_visit'
  | 'points_balance'
  | 'days_since_last_visit'
  | 'days_since_last_purchase'
  | 'customer_age_days'
  | 'purchased_category';

export type NumericOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
export type CategoryOperator = 'eq';
export type Operator = NumericOperator | CategoryOperator;

export const FIELD_KEYS: FieldKey[] = [
  'visits_count',
  'calls_count',
  'total_spend',
  'avg_spend_per_visit',
  'points_balance',
  'days_since_last_visit',
  'days_since_last_purchase',
  'customer_age_days',
  'purchased_category',
];

export const NUMERIC_OPERATORS: NumericOperator[] = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];
export const CATEGORY_OPERATORS: CategoryOperator[] = ['eq'];
export const ALL_OPERATORS: Operator[] = [...NUMERIC_OPERATORS, ...CATEGORY_OPERATORS];

/**
 * Columna real en el CTE "customer_facts" que construye CustomSegmentsService,
 * o null para 'purchased_category' (que no es una columna precalculada: se
 * traduce a un EXISTS contra purchase_items/products, porque el valor a
 * comparar —la categoría— solo se conoce al ejecutar la consulta).
 */
export const FIELD_DEFINITIONS: Record<
  FieldKey,
  { label: string; type: 'number' | 'category'; periodAware: boolean; column: string | null }
> = {
  visits_count: { label: 'Nº de visitas', type: 'number', periodAware: true, column: 'visits_count' },
  calls_count: { label: 'Nº de llamadas', type: 'number', periodAware: true, column: 'calls_count' },
  total_spend: { label: 'Gasto total (€)', type: 'number', periodAware: true, column: 'total_spend' },
  avg_spend_per_visit: {
    label: 'Gasto medio por visita (€)',
    type: 'number',
    periodAware: true,
    column: 'avg_spend_per_visit',
  },
  points_balance: { label: 'Saldo de puntos', type: 'number', periodAware: false, column: 'points_balance' },
  days_since_last_visit: {
    label: 'Días desde la última visita',
    type: 'number',
    periodAware: false,
    column: 'days_since_last_visit',
  },
  days_since_last_purchase: {
    label: 'Días desde la última compra',
    type: 'number',
    periodAware: false,
    column: 'days_since_last_purchase',
  },
  customer_age_days: {
    label: 'Antigüedad del cliente (días)',
    type: 'number',
    periodAware: false,
    column: 'customer_age_days',
  },
  purchased_category: {
    label: 'Ha comprado de la categoría',
    type: 'category',
    periodAware: true,
    column: null,
  },
};

export function operatorsFor(field: FieldKey): Operator[] {
  return FIELD_DEFINITIONS[field].type === 'number' ? NUMERIC_OPERATORS : CATEGORY_OPERATORS;
}
