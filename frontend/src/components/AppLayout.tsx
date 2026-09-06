import { ReactNode } from 'react';
import { useAuth } from '../AuthContext';

export type View = { name: 'dashboard' } | { name: 'customer'; customerId: string } | { name: 'segments' };

export function AppLayout({
  active,
  onNavigate,
  children,
}: {
  active: View['name'];
  onNavigate: (view: View) => void;
  children: ReactNode;
}) {
  const { session, logout } = useAuth();
  if (!session) {
    return null;
  }
  const canSeeSegments = session.user.role === 'owner' || session.user.role === 'admin';

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <span className="business-name">{session.tenant.name}</span>
          <span className="business-type">
            {session.user.email} · {session.user.role}
          </span>
          <nav className="topnav">
            <button
              type="button"
              className={active === 'dashboard' || active === 'customer' ? 'nav-link active' : 'nav-link'}
              onClick={() => onNavigate({ name: 'dashboard' })}
            >
              Clientes
            </button>
            {canSeeSegments && (
              <button
                type="button"
                className={active === 'segments' ? 'nav-link active' : 'nav-link'}
                onClick={() => onNavigate({ name: 'segments' })}
              >
                Segmentos
              </button>
            )}
          </nav>
        </div>
        <button type="button" className="btn-link" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
