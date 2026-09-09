import { FormEvent, useEffect, useState } from 'react';
import { ApiError, LEAD_STAGES, Lead, leadsApi, LeadStage } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

export function LeadsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [creating, setCreating] = useState(false);

  if (!session) {
    return null;
  }
  const canDelete = session.user.role === 'owner' || session.user.role === 'admin';

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const list = await leadsApi.list(session!.token);
      setLeads(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await leadsApi.create(session!.token, {
        fullName,
        company: company || undefined,
        email: email || undefined,
        phone: phone || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      });
      setFullName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setEstimatedValue('');
      setShowNewForm(false);
      await loadLeads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  async function handleDrop(stage: LeadStage) {
    setDragOverStage(null);
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.stage === stage) return;

    // Optimista: movemos la tarjeta ya mismo, y si falla en el servidor, revertimos.
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage } : l)));
    try {
      await leadsApi.updateStage(session!.token, lead.id, stage);
    } catch (err) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: lead.stage } : l)));
      setError(err instanceof ApiError ? err.message : 'No se pudo mover el lead');
    }
  }

  async function handleConvert(lead: Lead) {
    setError(null);
    try {
      const { customer } = await leadsApi.convertToCustomer(session!.token, lead.id);
      await loadLeads();
      onNavigate({ name: 'customer', customerId: customer.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo convertir el lead');
    }
  }

  async function handleDelete(lead: Lead) {
    try {
      await leadsApi.remove(session!.token, lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el lead');
    }
  }

  return (
    <AppLayout active="leads" onNavigate={onNavigate}>
      <h2>Leads</h2>
      {error && <div className="error-banner">{error}</div>}

      <button type="button" className="btn-secondary" onClick={() => setShowNewForm((v) => !v)} style={{ marginBottom: '1rem' }}>
        {showNewForm ? 'Cancelar' : '+ Nuevo lead'}
      </button>

      {showNewForm && (
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
          <div className="field">
            <label>Valor estimado (€)</label>
            <input type="number" min="0" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
          </div>
          <button type="submit" disabled={creating}>
            {creating ? 'Guardando...' : 'Crear lead'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="kanban-board">
          {LEAD_STAGES.map((stageDef) => {
            const stageLeads = leads.filter((l) => l.stage === stageDef.value);
            return (
              <div
                key={stageDef.value}
                className={dragOverStage === stageDef.value ? 'kanban-column drag-over' : 'kanban-column'}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stageDef.value);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stageDef.value)}
              >
                <div className="kanban-column-header">
                  {stageDef.label} ({stageLeads.length})
                </div>
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    draggable
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                  >
                    <div className="kanban-card-title">{lead.fullName}</div>
                    {lead.company && <div className="kanban-card-meta">{lead.company}</div>}
                    {lead.estimatedValue && <div className="kanban-card-meta">{lead.estimatedValue} €</div>}
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {lead.convertedCustomerId ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onNavigate({ name: 'customer', customerId: lead.convertedCustomerId! })}
                        >
                          Ver cliente
                        </button>
                      ) : (
                        <button type="button" className="btn-secondary" onClick={() => handleConvert(lead)}>
                          Convertir en cliente
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" className="delete-link" onClick={() => handleDelete(lead)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
