export type UserRole = 'owner' | 'admin' | 'employee';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}
