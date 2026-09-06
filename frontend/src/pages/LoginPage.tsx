import { FormEvent, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../AuthContext';

export function LoginPage({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAuth();
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = await api.login({ slug, email, password });
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
        <h1>Entrar</h1>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="slug">Identificador del negocio</label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ej. peluqueria-marisa"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
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
          ¿Negocio nuevo?{' '}
          <button type="button" className="btn-secondary" onClick={onSwitchToRegister}>
            Regístralo aquí
          </button>
        </div>
      </form>
    </div>
  );
}
