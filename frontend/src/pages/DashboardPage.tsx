import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Customer } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

export function DashboardPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);

  if (!session) {
    return null;
  }

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listCustomers(session!.token);
      setCustomers(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createCustomer(session!.token, {
        fullName,
        phone: phone || undefined,
        email: email || undefined,
      });
      setFullName('');
      setPhone('');
      setEmail('');
      await loadCustomers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteCustomer(session!.token, id);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  const canDelete = session.user.role === 'owner' || session.user.role === 'admin';

  return (
    <AppLayout active="dashboard" onNavigate={onNavigate}>
      <h2>Nuevo cliente</h2>
      {error && <div className="error-banner">{error}</div>}
      <form className="new-customer-form" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="fullName">Nombre</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Teléfono</label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Guardando...' : 'Añadir cliente'}
        </button>
      </form>

      <h2>Clientes</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : customers.length === 0 ? (
        <div className="empty-state">Todavía no hay clientes registrados.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Puntos</th>
              <th>Alta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.pointsBalance}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('es-ES')}</td>
                <td style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onNavigate({ name: 'customer', customerId: c.id })}
                  >
                    Ver ficha
                  </button>
                  {canDelete && (
                    <button type="button" className="delete-link" onClick={() => handleDelete(c.id)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppLayout>
  );
}
