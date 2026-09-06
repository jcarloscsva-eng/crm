import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, PointsConfig, SegmentCustomer, SegmentsResponse } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

function SegmentList({ title, customers, showAvg }: { title: string; customers: SegmentCustomer[]; showAvg?: boolean }) {
  return (
    <div className="section">
      <h3>
        {title} ({customers.length})
      </h3>
      {customers.length === 0 ? (
        <div className="empty-state">Ningún cliente en este segmento.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Visitas (actual)</th>
              <th>Visitas (anterior)</th>
              {showAvg && (
                <>
                  <th>Gasto medio actual</th>
                  <th>Gasto medio anterior</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.fullName}</td>
                <td>{c.visitsCurrentPeriod}</td>
                <td>{c.visitsPreviousPeriod}</td>
                {showAvg && (
                  <>
                    <td>{c.avgSpendCurrentPeriod?.toFixed(2) ?? '—'}</td>
                    <td>{c.avgSpendPreviousPeriod?.toFixed(2) ?? '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function SegmentsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pointsPerCurrencyUnit, setPointsPerCurrencyUnit] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  if (!session) {
    return null;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, pc] = await Promise.all([api.getSegments(session!.token), api.getPointsConfig(session!.token)]);
      setSegments(s);
      setPointsConfig(pc);
      setPointsPerCurrencyUnit(pc.pointsPerCurrencyUnit);
      setMinPurchaseAmount(pc.minPurchaseAmount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSaved(false);
    setError(null);
    try {
      const updated = await api.updatePointsConfig(session!.token, {
        pointsPerCurrencyUnit: Number(pointsPerCurrencyUnit),
        minPurchaseAmount: Number(minPurchaseAmount),
      });
      setPointsConfig(updated);
      setConfigSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <AppLayout active="segments" onNavigate={onNavigate}>
      <h2>Reglas de puntos</h2>
      {error && <div className="error-banner">{error}</div>}
      {pointsConfig && (
        <form className="inline-form section" onSubmit={handleSaveConfig}>
          <div className="field">
            <label htmlFor="pointsPerCurrencyUnit">Puntos por € gastado</label>
            <input
              id="pointsPerCurrencyUnit"
              type="number"
              step="0.01"
              min="0"
              value={pointsPerCurrencyUnit}
              onChange={(e) => setPointsPerCurrencyUnit(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="minPurchaseAmount">Compra mínima para dar puntos (€)</label>
            <input
              id="minPurchaseAmount"
              type="number"
              step="0.01"
              min="0"
              value={minPurchaseAmount}
              onChange={(e) => setMinPurchaseAmount(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={savingConfig}>
            {savingConfig ? 'Guardando...' : 'Guardar reglas'}
          </button>
          {configSaved && <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Guardado ✓</span>}
        </form>
      )}

      <h2>Segmentos</h2>
      {loading || !segments ? (
        <p>Cargando...</p>
      ) : (
        <>
          <p className="business-type">
            Comparando los últimos {segments.periodMonths} meses frente a los {segments.periodMonths} meses
            anteriores.
          </p>
          <div className="segment-grid">
            <SegmentList title="Visitas disminuidas" customers={segments.visitsDecreased} />
            <SegmentList title="Gasto medio por visita ↑" customers={segments.avgSpendIncreased} showAvg />
            <SegmentList title="Gasto medio por visita ↓" customers={segments.avgSpendDecreased} showAvg />
          </div>
        </>
      )}
    </AppLayout>
  );
}
