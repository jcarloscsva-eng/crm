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
  const [search, setSearch] = useState('');

  const [showTrash, setShowTrash] = useState(false);
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [purgingId, setPurgingId] = useState<string | null>(null);

  if (!session) {
    return null;
  }

  async function loadCustomers(query?: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listCustomers(session!.token, query);
      setCustomers(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(search || undefined), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
      await loadCustomers(search || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteCustomer(session!.token, id);
      await loadCustomers(search || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  const canDelete = session.user.role === 'owner' || session.user.role === 'admin';

  async function loadTrash() {
    setLoadingTrash(true);
    setError(null);
    try {
      setDeletedCustomers(await api.listDeletedCustomers(session!.token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoadingTrash(false);
    }
  }

  function toggleTrash() {
    const next = !showTrash;
    setShowTrash(next);
    if (next) loadTrash();
  }

  async function handleExportDeleted(id: string) {
    setError(null);
    try {
      const data = await api.exportCustomerData(session!.token, id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cliente-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  async function handlePurge(id: string, name: string) {
    if (!window.confirm(`Esto borra PARA SIEMPRE todos los datos de "${name}" (compras, visitas, llamadas, devoluciones). No se puede deshacer. ¿Continuar?`)) {
      return;
    }
    setPurgingId(id);
    setError(null);
    try {
      await api.purgeCustomer(session!.token, id);
      await loadTrash();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setPurgingId(null);
    }
  }

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
      <div className="field" style={{ maxWidth: '320px', marginBottom: '1rem' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
        />
      </div>
      {loading ? (
        <p>Cargando...</p>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          {search ? 'Sin resultados para esa búsqueda.' : 'Todavía no hay clientes registrados.'}
        </div>
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

      {canDelete && (
        <div className="section" style={{ marginTop: '2rem' }}>
          <button type="button" className="btn-secondary" onClick={toggleTrash}>
            {showTrash ? 'Ocultar papelera' : 'Ver papelera (clientes borrados)'}
          </button>

          {showTrash && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Clientes con borrado lógico. Desde aquí puedes exportar sus datos (RGPD) o purgarlos
                definitivamente — la purga es irreversible y elimina también sus interacciones, compras y
                devoluciones.
              </p>
              {loadingTrash ? (
                <p>Cargando...</p>
              ) : deletedCustomers.length === 0 ? (
                <div className="empty-state">No hay clientes borrados.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Borrado el</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedCustomers.map((c) => (
                      <tr key={c.id}>
                        <td>{c.fullName}</td>
                        <td>{c.deletedAt ? new Date(c.deletedAt).toLocaleString('es-ES') : '—'}</td>
                        <td style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="button" className="btn-secondary" onClick={() => handleExportDeleted(c.id)}>
                            Exportar datos
                          </button>
                          <button
                            type="button"
                            className="delete-link"
                            disabled={purgingId === c.id}
                            onClick={() => handlePurge(c.id, c.fullName)}
                          >
                            {purgingId === c.id ? 'Purgando...' : 'Purgar definitivamente'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
