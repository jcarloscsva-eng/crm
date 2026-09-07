import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, CALL_OUTCOME_LABELS, CallOutcome, Customer, Interaction, Product, Purchase } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

interface CartLine {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [interactionType, setInteractionType] = useState<'call' | 'visit'>('visit');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallOutcome | ''>('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [savingInteraction, setSavingInteraction] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
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
      const [c, i, p, prods] = await Promise.all([
        api.getCustomer(session!.token, customerId),
        api.listInteractions(session!.token, customerId),
        api.listPurchases(session!.token, customerId),
        api.listProducts(session!.token),
      ]);
      setCustomer(c);
      setInteractions(i);
      setPurchases(p);
      setProducts(prods);
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
        outcome: interactionType === 'call' && callOutcome ? callOutcome : undefined,
        followUpAt: interactionType === 'call' && followUpAt ? new Date(followUpAt).toISOString() : undefined,
      });
      setInteractionNotes('');
      setCallOutcome('');
      setFollowUpAt('');
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSavingInteraction(false);
    }
  }

  function addLine() {
    const product = products.find((p) => p.id === selectedProductId);
    const quantity = Number(lineQuantity);
    if (!product || !quantity || quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { productId: product.id, productName: product.name, unitPrice: Number(product.price), quantity }];
    });
    setLineQuantity('1');
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  async function handleCreatePurchase(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setSavingPurchase(true);
    setError(null);
    try {
      await api.createPurchase(session!.token, customerId, {
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      setCart([]);
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
              {interactionType === 'call' && (
                <>
                  <div className="field">
                    <label htmlFor="callOutcome">Resultado</label>
                    <select
                      id="callOutcome"
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value as CallOutcome | '')}
                    >
                      <option value="">Sin especificar</option>
                      {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="followUpAt">Seguimiento</label>
                    <input
                      id="followUpAt"
                      type="datetime-local"
                      value={followUpAt}
                      onChange={(e) => setFollowUpAt(e.target.value)}
                    />
                  </div>
                </>
              )}
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
                    <th>Resultado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((i) => (
                    <tr key={i.id}>
                      <td>{i.type === 'visit' ? 'Visita' : 'Llamada'}</td>
                      <td>{i.notes ?? '—'}</td>
                      <td>{i.outcome ? CALL_OUTCOME_LABELS[i.outcome] : '—'}</td>
                      <td>{new Date(i.occurredAt).toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h3>Registrar compra</h3>
            {products.length === 0 ? (
              <div className="empty-state">No hay productos activos. Créalos en la página de Productos.</div>
            ) : (
              <>
                <div className="inline-form">
                  <div className="field" style={{ flex: 2 }}>
                    <label>Producto</label>
                    <select id="productSelect" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                      <option value="">Selecciona...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price} €
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Cantidad</label>
                    <input
                      id="lineQuantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={lineQuantity}
                      onChange={(e) => setLineQuantity(e.target.value)}
                    />
                  </div>
                  <button type="button" onClick={addLine} disabled={!selectedProductId}>
                    Añadir línea
                  </button>
                </div>

                {cart.length > 0 && (
                  <form onSubmit={handleCreatePurchase} style={{ marginTop: '1rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((l) => (
                          <tr key={l.productId}>
                            <td>{l.productName}</td>
                            <td>{l.quantity}</td>
                            <td>{l.unitPrice} €</td>
                            <td>{(l.unitPrice * l.quantity).toFixed(2)} €</td>
                            <td>
                              <button type="button" className="delete-link" onClick={() => removeLine(l.productId)}>
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div id="cartTotal" style={{ margin: '0.75rem 0', fontWeight: 600 }}>
                      Total: {cartTotal.toFixed(2)} €
                    </div>
                    <button type="submit" disabled={savingPurchase}>
                      {savingPurchase ? 'Guardando...' : 'Confirmar compra'}
                    </button>
                  </form>
                )}
              </>
            )}
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
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {p.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.product.name} ({item.unitPrice} €) = {item.subtotal} €
                        </li>
                      ))}
                    </ul>
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
