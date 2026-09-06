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

export interface Interaction {
  id: string;
  customerId: string;
  type: 'call' | 'visit';
  notes: string | null;
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

export interface Purchase {
  id: string;
  customerId: string;
  amount: string;
  pointsEarned: string;
  occurredAt: string;
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

  listCustomers(token: string) {
    return request<Customer[]>('/customers', {}, token);
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

  createInteraction(token: string, customerId: string, data: { type: 'call' | 'visit'; notes?: string }) {
    return request<Interaction>(
      `/customers/${customerId}/interactions`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
  },

  listPurchases(token: string, customerId: string) {
    return request<Purchase[]>(`/customers/${customerId}/purchases`, {}, token);
  },

  createPurchase(token: string, customerId: string, data: { amount: number }) {
    return request<Purchase>(
      `/customers/${customerId}/purchases`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    );
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
};
