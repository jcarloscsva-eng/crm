import { FormEvent, useState } from 'react';
import { ApiError, platformAdminApi } from '../api';

export function PlatformAdminLoginPage({
  onLogin,
  onSwitchToTenant,
}: {
  onLogin: (token: string, email: string) => void;
  onSwitchToTenant: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = await platformAdminApi.login({ email, password });
      onLogin(auth.accessToken, auth.admin.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-centered">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Administrador de la plataforma</h1>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="paEmail">Email</label>
          <input id="paEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="paPassword">Contraseña</label>
          <input
            id="paPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="switch-line">
          <button type="button" className="btn-link" onClick={onSwitchToTenant}>
            ← Volver al acceso de negocio
          </button>
        </div>
      </form>
    </div>
  );
}
