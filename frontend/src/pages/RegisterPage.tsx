import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../AuthContext';

const BUSINESS_TYPES = [
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'centro_estetica', label: 'Centro de estética' },
  { value: 'taller', label: 'Taller' },
  { value: 'cristaleria', label: 'Cristalería' },
  { value: 'toldos', label: 'Ventanas / toldos' },
  { value: 'otro', label: 'Otro' },
];

export function RegisterPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { login } = useAuth();
  const [slug, setSlug] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0].value);
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = await api.registerTenant({
        slug,
        businessName,
        businessType,
        ownerFullName,
        ownerEmail,
        ownerPassword,
      });
      login(auth);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-centered">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Registrar negocio</h1>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="slug">Identificador (para iniciar sesión)</label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ej. peluqueria-marisa"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="minúsculas, números y guiones"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="businessName">Nombre del negocio</label>
          <input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="businessType">Tipo de negocio</label>
          <select id="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ownerFullName">Tu nombre</label>
          <input id="ownerFullName" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="ownerEmail">Tu email</label>
          <input
            id="ownerEmail"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="ownerPassword">Contraseña</label>
          <input
            id="ownerPassword"
            type="password"
            minLength={8}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creando...' : 'Crear negocio'}
        </button>
        <div className="switch-line">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="btn-secondary" onClick={onSwitchToLogin}>
            Entra aquí
          </button>
        </div>
      </form>
    </div>
  );
}
