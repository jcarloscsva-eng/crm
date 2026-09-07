import { FormEvent, useState } from 'react';
import { api, ApiError, CALL_OUTCOME_LABELS, CallOutcome, Customer } from '../api';
import { useAuth } from '../AuthContext';
import { View } from './AppLayout';

type Step = 'menu' | 'newCustomer' | 'searchForCall' | 'callForm' | 'searchForPurchase';

export function QuickActionModal({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [followUpAt, setFollowUpAt] = useState('');

  if (!session) {
    return null;
  }

  function reset() {
    setStep('menu');
    setError(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setQuery('');
    setResults([]);
    setSelectedCustomer(null);
    setNotes('');
    setOutcome('');
    setFollowUpAt('');
  }

  function close() {
    setIsOpen(false);
    reset();
  }

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const list = await api.listCustomers(session!.token, value);
      setResults(list);
    } catch {
      // búsqueda rápida: un fallo aquí no bloquea el resto del modal
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateCustomer(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const customer = await api.createCustomer(session!.token, {
        fullName,
        phone: phone || undefined,
        email: email || undefined,
      });
      close();
      onNavigate({ name: 'customer', customerId: customer.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCall(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);
    setError(null);
    try {
      await api.createInteraction(session!.token, selectedCustomer.id, {
        type: 'call',
        notes: notes || undefined,
        outcome: outcome || undefined,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      });
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  function pickCustomerForPurchase(customer: Customer) {
    close();
    onNavigate({ name: 'customer', customerId: customer.id });
  }

  return (
    <>
      <button type="button" className="fab" onClick={() => setIsOpen(true)} aria-label="Acción rápida">
        +
      </button>

      {isOpen && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={close} aria-label="Cerrar">
              ×
            </button>
            {error && <div className="error-banner">{error}</div>}

            {step === 'menu' && (
              <>
                <h3>Acción rápida</h3>
                <div className="quick-action-list">
                  <button type="button" onClick={() => setStep('newCustomer')}>
                    Nuevo cliente
                  </button>
                  <button type="button" onClick={() => setStep('searchForCall')}>
                    Nueva llamada
                  </button>
                  <button type="button" onClick={() => setStep('searchForPurchase')}>
                    Nueva compra
                  </button>
                </div>
              </>
            )}

            {step === 'newCustomer' && (
              <>
                <h3>Nuevo cliente</h3>
                <form onSubmit={handleCreateCustomer}>
                  <div className="field">
                    <label>Nombre</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
                  </div>
                  <div className="field">
                    <label>Teléfono</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Crear cliente'}
                  </button>
                </form>
              </>
            )}

            {(step === 'searchForCall' || step === 'searchForPurchase') && (
              <>
                <h3>{step === 'searchForCall' ? 'Nueva llamada — busca el cliente' : 'Nueva compra — busca el cliente'}</h3>
                <input
                  value={query}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="Nombre, teléfono o email..."
                  autoFocus
                />
                {searching && <p className="business-type">Buscando...</p>}
                {results.length > 0 && (
                  <ul className="search-results">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() =>
                            step === 'searchForCall'
                              ? (setSelectedCustomer(c), setStep('callForm'))
                              : pickCustomerForPurchase(c)
                          }
                        >
                          {c.fullName} {c.phone ? `· ${c.phone}` : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <div className="empty-state">Sin resultados.</div>
                )}
              </>
            )}

            {step === 'callForm' && selectedCustomer && (
              <>
                <h3>Llamada a {selectedCustomer.fullName}</h3>
                <form onSubmit={handleCreateCall}>
                  <div className="field">
                    <label>Resultado</label>
                    <select value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome | '')}>
                      <option value="">Sin especificar</option>
                      {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Notas</label>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Fecha de seguimiento (opcional)</label>
                    <input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Registrar llamada'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
