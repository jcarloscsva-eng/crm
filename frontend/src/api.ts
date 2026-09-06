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

  deleteCustomer(token: string, id: string) {
    return request<Customer>(`/customers/${id}`, { method: 'DELETE' }, token);
  },
};
