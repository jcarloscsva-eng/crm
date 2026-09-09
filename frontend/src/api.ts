const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? message;
    } catch {
      // el cuerpo no era JSON, se deja el mensaje genérico
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  accessToken: string;
  tenant: { id: string; slug: string; name: string };
  user: { id: string; email: string; role: 'owner' | 'admin' | 'employee' };
}

export interface Customer {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  pointsBalance: string;
  customFields: Record<string, unknown>;
  consentMarketing: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export type CallOutcome = 'sale_closed' | 'interested' | 'not_interested' | 'call_back';

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  sale_closed: 'Venta cerrada',
  interested: 'Interesado',
  not_interested: 'Sin interés',
  call_back: 'Volver a llamar',
};

export interface Interaction {
  id: string;
  customerId: string;
  type: 'call' | 'visit';
  notes: string | null;
  outcome: CallOutcome | null;
  followUpAt: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ReturnRecord {
  id: string;
  purchaseId: string;
  customerId: string;
  amount: string;
  pointsReversed: string;
  reason: string | null;
  occurredAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  price: string;
  active: boolean;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  product: Product;
}

export interface Purchase {
  id: string;
  customerId: string;
  amount: string;
  pointsEarned: string;
  occurredAt: string;
  items: PurchaseItem[];
  returns: ReturnRecord[];
}

export interface PointsConfig {
  tenantId: string;
  pointsPerCurrencyUnit: string;
  minPurchaseAmount: string;
  updatedAt: string;
}

export interface SegmentCustomer {
  id: string;
  fullName: string;
  visitsCurrentPeriod: number;
  visitsPreviousPeriod: number;
  avgSpendCurrentPeriod: number | null;
  avgSpendPreviousPeriod: number | null;
}

export interface SegmentsResponse {
  periodMonths: number;
  visitsDecreased: SegmentCustomer[];
  avgSpendIncreased: SegmentCustomer[];
  avgSpendDecreased: SegmentCustomer[];
}

export type SegmentFieldKey =
  | 'visits_count'
  | 'calls_count'
  | 'total_spend'
  | 'avg_spend_per_visit'
  | 'points_balance'
  | 'days_since_last_visit'
  | 'days_since_last_purchase'
  | 'customer_age_days'
  | 'purchased_category';

export type SegmentOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';

export interface FieldDefinition {
  key: SegmentFieldKey;
  label: string;
  type: 'number' | 'category';
  periodAware: boolean;
  operators: SegmentOperator[];
}

export interface SegmentCondition {
  field: SegmentFieldKey;
  operator: SegmentOperator;
  value: string;
  value2?: string;
}

export interface SegmentQuery {
  periodDays: number;
  matchType: 'all' | 'any';
  conditions: SegmentCondition[];
}

export interface CustomerFactsRow {
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

export interface SavedSegment {
  id: string;
  name: string;
  periodDays: number;
  matchType: 'all' | 'any';
  conditions: SegmentCondition[];
  createdAt: string;
}

export interface CustomerSpendRow {
  id: string;
  fullName: string;
  grossSpend: number;
  totalReturned: number;
  netSpend: number;
  pointsBalance: number;
}

export interface CustomerReport {
  totalCustomers: number;
  newThisMonth: number;
  topBySpend: CustomerSpendRow[];
  topByPoints: CustomerSpendRow[];
}

export interface ProductSalesRow {
  id: string;
  name: string;
  category: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ProductReport {
  totalActiveProducts: number;
  topByQuantity: ProductSalesRow[];
  topByRevenue: ProductSalesRow[];
}

export const api = {
  registerTenant(data: {
    slug: string;
    businessName: string;
    businessType?: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerFullName: string;
  }) {
    return request<AuthResponse>('/auth/register-tenant', { method: 'POST', body: JSON.stringify(data) });
  },

  login(data: { slug: string; email: string; password: string }) {
    return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  },

  listCustomers(token: string, search?: string) {
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    return request<Customer[]>(`/customers${qs}`, {}, token);
  },

  createCustomer(
    token: string,
    data: { fullName: string; phone?: string; email?: string; customFields?: Record<string, unknown> },
  ) {
    return request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  getCustomer(token: string, id: string) {
    return request<Customer>(`/customers/${id}`, {}, token);
  },

  deleteCustomer(token: string, id: string) {
    return request<Customer>(`/customers/${id}`, { method: 'DELETE' }, token);
  },

  listInteractions(token: string, customerId: string) {
    return request<Interaction[]>(`/customers/${customerId}/interactions`, {}, token);
  },

  createInteraction(
    token: string,
    customerId: string,
    data: { type: 'call' | 'visit'; notes?: string; outcome?: CallOutcome; followUpAt?: string },
  ) {
    return request<Interaction>(
      `/customers/${customerId}/interactions`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  listPurchases(token: string, customerId: string) {
    return request<Purchase[]>(`/customers/${customerId}/purchases`, {}, token);
  },

  createPurchase(
    token: string,
    customerId: string,
    data: { items: { productId: string; quantity: number; unitPrice?: number }[] },
  ) {
    return request<Purchase>(
      `/customers/${customerId}/purchases`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  listProducts(token: string, includeInactive?: boolean) {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return request<Product[]>(`/products${qs}`, {}, token);
  },

  createProduct(token: string, data: { name: string; category?: string; price: number }) {
    return request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  updateProduct(token: string, id: string, data: { name?: string; category?: string; price?: number; active?: boolean }) {
    return request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token);
  },

  getProductCategories(token: string) {
    return request<string[]>('/products/categories', {}, token);
  },

  getCustomerReport(token: string) {
    return request<CustomerReport>('/reports/customers', {}, token);
  },

  getProductReport(token: string) {
    return request<ProductReport>('/reports/products', {}, token);
  },

  createReturn(
    token: string,
    customerId: string,
    purchaseId: string,
    data: { amount: number; reason?: string },
  ) {
    return request<ReturnRecord>(
      `/customers/${customerId}/purchases/${purchaseId}/returns`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  getPointsConfig(token: string) {
    return request<PointsConfig>('/points-config', {}, token);
  },

  updatePointsConfig(token: string, data: { pointsPerCurrencyUnit?: number; minPurchaseAmount?: number }) {
    return request<PointsConfig>('/points-config', { method: 'PATCH', body: JSON.stringify(data) }, token);
  },

  getSegments(token: string) {
    return request<SegmentsResponse>('/segments', {}, token);
  },

  getSegmentFields(token: string) {
    return request<FieldDefinition[]>('/custom-segments/fields', {}, token);
  },

  previewCustomSegment(token: string, dto: SegmentQuery) {
    return request<CustomerFactsRow[]>('/custom-segments/preview', { method: 'POST', body: JSON.stringify(dto) }, token);
  },

  createCustomSegment(token: string, dto: SegmentQuery & { name: string }) {
    return request<SavedSegment>('/custom-segments', { method: 'POST', body: JSON.stringify(dto) }, token);
  },

  listCustomSegments(token: string) {
    return request<SavedSegment[]>('/custom-segments', {}, token);
  },

  getCustomSegmentResults(token: string, id: string) {
    return request<{ segment: SavedSegment; results: CustomerFactsRow[] }>(`/custom-segments/${id}/results`, {}, token);
  },

  deleteCustomSegment(token: string, id: string) {
    return request<{ id: string }>(`/custom-segments/${id}`, { method: 'DELETE' }, token);
  },
};

export interface PlatformAdminAuthResponse {
  accessToken: string;
  admin: { id: string; email: string };
}

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  businessType: string | null;
  createdAt: string;
  userCount: number;
  customerCount: number;
}

export const platformAdminApi = {
  login(data: { email: string; password: string }) {
    return request<PlatformAdminAuthResponse>('/platform-admin/login', { method: 'POST', body: JSON.stringify(data) });
  },

  listTenants(token: string) {
    return request<TenantSummary[]>('/platform-admin/tenants', {}, token);
  },

  createTenant(
    token: string,
    data: {
      slug: string;
      businessName: string;
      businessType?: string;
      ownerEmail: string;
      ownerPassword: string;
      ownerFullName: string;
    },
  ) {
    return request<{ tenant: TenantSummary; owner: { id: string; email: string } }>(
      '/platform-admin/tenants',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },
};

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Cualificado' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

export interface Lead {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  estimatedValue: string | null;
  stage: LeadStage;
  notes: string | null;
  source: string | null;
  convertedCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContactCategory = 'partner' | 'interesting';

export interface Contact {
  id: string;
  category: ContactCategory;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
}

export const leadsApi = {
  list(token: string) {
    return request<Lead[]>('/leads', {}, token);
  },
  create(
    token: string,
    data: {
      fullName: string;
      company?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      estimatedValue?: number;
      notes?: string;
    },
  ) {
    return request<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }, token);
  },
  updateStage(token: string, id: string, stage: LeadStage) {
    return request<Lead>(`/leads/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }, token);
  },
  convertToCustomer(token: string, id: string) {
    return request<{ lead: Lead; customer: Customer }>(`/leads/${id}/convert-to-customer`, { method: 'POST' }, token);
  },
  remove(token: string, id: string) {
    return request<{ id: string }>(`/leads/${id}`, { method: 'DELETE' }, token);
  },
};

export const contactsApi = {
  list(token: string, category?: ContactCategory) {
    const qs = category ? `?category=${category}` : '';
    return request<Contact[]>(`/contacts${qs}`, {}, token);
  },
  create(
    token: string,
    data: {
      category: ContactCategory;
      fullName: string;
      company?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      notes?: string;
      source?: string;
    },
  ) {
    return request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }, token);
  },
  update(token: string, id: string, data: Partial<{ fullName: string; company: string; email: string; phone: string; notes: string }>) {
    return request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token);
  },
  remove(token: string, id: string) {
    return request<{ id: string }>(`/contacts/${id}`, { method: 'DELETE' }, token);
  },
};
