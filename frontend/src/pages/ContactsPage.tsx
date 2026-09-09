import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Contact, ContactCategory, contactsApi, Customer } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

function ContactTable({
  category,
  token,
  canDelete,
}: {
  category: ContactCategory;
  token: string;
  canDelete: boolean;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setContacts(await contactsApi.list(token, category));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await contactsApi.create(token, {
        category,
        fullName,
        company: company || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      setFullName('');
      setCompany('');
      setEmail('');
      setPhone('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await contactsApi.remove(token, id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el contacto');
    }
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      <form className="new-customer-form" onSubmit={handleCreate}>
        <div className="field">
          <label>Nombre</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Empresa</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Guardando...' : 'Añadir'}
        </button>
      </form>

      {loading ? (
        <p>Cargando...</p>
      ) : contacts.length === 0 ? (
        <div className="empty-state">Todavía no hay nada aquí.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Notas</th>
              {canDelete && <th></th>}
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName}</td>
                <td>{c.company ?? '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.notes ?? '—'}</td>
                {canDelete && (
                  <td>
                    <button type="button" className="delete-link" onClick={() => handleDelete(c.id)}>
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CustomersReadOnlyTable({ token, onNavigate }: { token: string; onNavigate: (view: View) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listCustomers(token).then(setCustomers).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p>Cargando...</p>;
  if (customers.length === 0) return <div className="empty-state">Todavía no hay clientes registrados.</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Email</th>
          <th>Puntos</th>
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
            <td>
              <button type="button" className="btn-secondary" onClick={() => onNavigate({ name: 'customer', customerId: c.id })}>
                Ver ficha
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ContactsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [tab, setTab] = useState<'customers' | 'partner' | 'interesting'>('customers');

  if (!session) {
    return null;
  }
  const canDelete = session.user.role === 'owner' || session.user.role === 'admin';

  return (
    <AppLayout active="contacts" onNavigate={onNavigate}>
      <h2>Contactos</h2>
      <div className="report-tabs">
        <button type="button" className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>
          Clientes
        </button>
        <button type="button" className={tab === 'partner' ? 'active' : ''} onClick={() => setTab('partner')}>
          Partners
        </button>
        <button type="button" className={tab === 'interesting' ? 'active' : ''} onClick={() => setTab('interesting')}>
          Contactos interesantes
        </button>
      </div>

      {tab === 'customers' && <CustomersReadOnlyTable token={session.token} onNavigate={onNavigate} />}
      {tab === 'partner' && <ContactTable category="partner" token={session.token} canDelete={canDelete} />}
      {tab === 'interesting' && <ContactTable category="interesting" token={session.token} canDelete={canDelete} />}
    </AppLayout>
  );
}
