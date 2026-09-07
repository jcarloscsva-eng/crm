import { FormEvent, useEffect, useState } from 'react';
import { ApiError, platformAdminApi, TenantSummary } from '../api';

const BUSINESS_TYPES = [
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'centro_estetica', label: 'Centro de estética' },
  { value: 'taller', label: 'Taller' },
  { value: 'cristaleria', label: 'Cristalería' },
  { value: 'toldos', label: 'Ventanas / toldos' },
  { value: 'otro', label: 'Otro' },
];

export function PlatformAdminDashboardPage({
  token,
  adminEmail,
  onLogout,
}: {
  token: string;
  adminEmail: string;
  onLogout: () => void;
}) {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0].value);
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<{ slug: string; ownerEmail: string } | null>(null);

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const list = await platformAdminApi.listTenants(token);
      setTenants(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setJustCreated(null);
    try {
      await platformAdminApi.createTenant(token, {
        slug,
        businessName,
        businessType,
        ownerFullName,
        ownerEmail,
        ownerPassword,
      });
      setJustCreated({ slug, ownerEmail });
      setSlug('');
      setBusinessName('');
      setOwnerFullName('');
      setOwnerEmail('');
      setOwnerPassword('');
      await loadTenants();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <span className="business-name">Administrador de la plataforma</span>
          <span className="business-type">{adminEmail}</span>
        </div>
        <button type="button" className="btn-link" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      <div className="content">
        <h2>Autorizar un negocio nuevo</h2>
        {error && <div className="error-banner">{error}</div>}
        {justCreated && (
          <div className="section" style={{ borderColor: 'var(--primary)' }}>
            Negocio <strong>{justCreated.slug}</strong> creado. Comparte estas credenciales con su dueño para que
            entre en <code>/</code>: email <strong>{justCreated.ownerEmail}</strong> y la contraseña que elegiste.
          </div>
        )}
        <form className="new-customer-form" onSubmit={handleCreate}>
          <div className="field">
            <label>Identificador</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ej. peluqueria-marisa"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </div>
          <div className="field">
            <label>Nombre del negocio</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Nombre del dueño</label>
            <input value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email del dueño</label>
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Contraseña inicial</label>
            <input
              type="password"
              minLength={8}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={creating}>
            {creating ? 'Creando...' : 'Crear negocio'}
          </button>
        </form>

        <h2>Negocios autorizados</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : tenants.length === 0 ? (
          <div className="empty-state">Todavía no has autorizado ningún negocio.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Usuarios</th>
                <th>Clientes</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>{t.slug}</td>
                  <td>{t.name}</td>
                  <td>{t.businessType ?? '—'}</td>
                  <td>{t.userCount}</td>
                  <td>{t.customerCount}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
