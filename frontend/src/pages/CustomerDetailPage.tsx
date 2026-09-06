import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Customer, Interaction, Purchase } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

export function CustomerDetailPage({
  customerId,
  onNavigate,
}: {
  customerId: string;
  onNavigate: (view: View) => void;
}) {
  const { session } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [interactionType, setInteractionType] = useState<'call' | 'visit'>('visit');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [savingInteraction, setSavingInteraction] = useState(false);

  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [savingPurchase, setSavingPurchase] = useState(false);

  const [returnOpenFor, setReturnOpenFor] = useState<string | null>(null);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);

  if (!session) {
    return null;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, i, p] = await Promise.all([
        api.getCustomer(session!.token, customerId),
        api.listInteractions(session!.token, customerId),
        api.listPurchases(session!.token, customerId),
      ]);
      setCustomer(c);
      setInteractions(i);
      setPurchases(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleCreateInteraction(e: FormEvent) {
    e.preventDefault();
    setSavingInteraction(true);
    setError(null);
    try {
      await api.createInteraction(session!.token, customerId, {
        type: interactionType,
        notes: interactionNotes || undefined,
      });
      setInteractionNotes('');
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSavingInteraction(false);
    }
  }

  async function handleCreatePurchase(e: FormEvent) {
    e.preventDefault();
    setSavingPurchase(true);
    setError(null);
    try {
      await api.createPurchase(session!.token, customerId, { amount: Number(purchaseAmount) });
      setPurchaseAmount('');
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleCreateReturn(e: FormEvent, purchaseId: string) {
    e.preventDefault();
    setSavingReturn(true);
    setError(null);
    try {
      await api.createReturn(session!.token, customerId, purchaseId, {
        amount: Number(returnAmount),
        reason: returnReason || undefined,
      });
      setReturnOpenFor(null);
      setReturnAmount('');
      setReturnReason('');
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSavingReturn(false);
    }
  }

  return (
    <AppLayout active="customer" onNavigate={onNavigate}>
      <button type="button" className="back-link" onClick={() => onNavigate({ name: 'dashboard' })}>
        ← Volver a clientes
      </button>

      {error && <div className="error-banner">{error}</div>}

      {loading || !customer ? (
        <p>Cargando...</p>
      ) : (
        <>
          <h2>{customer.fullName}</h2>
          <div className="points-summary">
            <div className="stat">
              <div className="value">{customer.pointsBalance}</div>
              <div className="label">Puntos acumulados</div>
            </div>
            <div className="stat">
              <div className="value">{interactions.filter((i) => i.type === 'visit').length}</div>
              <div className="label">Visitas registradas</div>
            </div>
            <div className="stat">
              <div className="value">{purchases.length}</div>
              <div className="label">Compras registradas</div>
            </div>
          </div>

          <div className="section">
            <h3>Registrar interacción</h3>
            <form className="inline-form" onSubmit={handleCreateInteraction}>
              <div className="field">
                <label htmlFor="interactionType">Tipo</label>
                <select
                  id="interactionType"
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value as 'call' | 'visit')}
                >
                  <option value="visit">Visita</option>
                  <option value="call">Llamada</option>
                </select>
              </div>
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor="interactionNotes">Notas</label>
                <input
                  id="interactionNotes"
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  placeholder="opcional"
                />
              </div>
              <button type="submit" disabled={savingInteraction}>
                {savingInteraction ? 'Guardando...' : 'Registrar'}
              </button>
            </form>
          </div>

          <div className="section">
            <h3>Interacciones</h3>
            {interactions.length === 0 ? (
              <div className="empty-state">Sin interacciones todavía.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Notas</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((i) => (
                    <tr key={i.id}>
                      <td>{i.type === 'visit' ? 'Visita' : 'Llamada'}</td>
                      <td>{i.notes ?? '—'}</td>
                      <td>{new Date(i.occurredAt).toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h3>Registrar compra</h3>
            <form className="inline-form" onSubmit={handleCreatePurchase}>
              <div className="field">
                <label htmlFor="purchaseAmount">Importe (€)</label>
                <input
                  id="purchaseAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={savingPurchase}>
                {savingPurchase ? 'Guardando...' : 'Registrar compra'}
              </button>
            </form>
          </div>

          <div className="section">
            <h3>Compras</h3>
            {purchases.length === 0 ? (
              <div className="empty-state">Sin compras todavía.</div>
            ) : (
              purchases.map((p) => {
                const alreadyReturned = p.returns.reduce((sum, r) => sum + Number(r.amount), 0);
                const remaining = Number(p.amount) - alreadyReturned;
                return (
                  <div key={p.id} style={{ borderTop: '1px solid var(--border)', padding: '0.85rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>{p.amount} €</strong> · {p.pointsEarned} puntos ·{' '}
                        {new Date(p.occurredAt).toLocaleDateString('es-ES')}
                        {alreadyReturned > 0 && (
                          <span className="business-type"> · devuelto: {alreadyReturned} €</span>
                        )}
                      </div>
                      {remaining > 0 && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setReturnOpenFor(returnOpenFor === p.id ? null : p.id);
                            setReturnAmount('');
                            setReturnReason('');
                          }}
                        >
                          {returnOpenFor === p.id ? 'Cancelar' : 'Registrar devolución'}
                        </button>
                      )}
                    </div>
                    {returnOpenFor === p.id && (
                      <form
                        className="inline-form"
                        style={{ marginTop: '0.75rem' }}
                        onSubmit={(e) => handleCreateReturn(e, p.id)}
                      >
                        <div className="field">
                          <label>Importe a devolver (máx. {remaining})</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remaining}
                            value={returnAmount}
                            onChange={(e) => setReturnAmount(e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label>Motivo</label>
                          <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="opcional" />
                        </div>
                        <button type="submit" disabled={savingReturn}>
                          {savingReturn ? 'Guardando...' : 'Confirmar devolución'}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
