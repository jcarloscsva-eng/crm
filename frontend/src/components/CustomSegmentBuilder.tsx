import { useEffect, useState } from 'react';
import {
  api,
  ApiError,
  CustomerFactsRow,
  FieldDefinition,
  SavedSegment,
  SegmentCondition,
  SegmentOperator,
} from '../api';
import { useAuth } from '../AuthContext';

const OPERATOR_LABELS: Record<SegmentOperator, string> = {
  gt: 'mayor que',
  gte: 'mayor o igual que',
  lt: 'menor que',
  lte: 'menor o igual que',
  eq: 'igual a',
  between: 'entre',
};

type NumericFactKey = Exclude<keyof CustomerFactsRow, 'id' | 'fullName'>;

const FIELD_COLUMNS: { key: NumericFactKey; label: string }[] = [
  { key: 'visits_count', label: 'Visitas' },
  { key: 'calls_count', label: 'Llamadas' },
  { key: 'total_spend', label: 'Gasto total' },
  { key: 'avg_spend_per_visit', label: 'Gasto medio/visita' },
  { key: 'points_balance', label: 'Puntos' },
  { key: 'days_since_last_visit', label: 'Días desde última visita' },
];

function defaultCondition(fields: FieldDefinition[]): SegmentCondition {
  const first = fields[0];
  return { field: first.key, operator: first.operators[0], value: '' };
}

function formatCell(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ResultsTable({ rows }: { rows: CustomerFactsRow[] }) {
  if (rows.length === 0) {
    return <div className="empty-state">Ningún cliente coincide con este filtro.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          {FIELD_COLUMNS.map((c) => (
            <th key={c.key}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.fullName}</td>
            {FIELD_COLUMNS.map((c) => (
              <td key={c.key}>{formatCell(r[c.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CustomSegmentBuilder() {
  const { session } = useAuth();
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [savedSegments, setSavedSegments] = useState<SavedSegment[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [periodDays, setPeriodDays] = useState('90');
  const [matchType, setMatchType] = useState<'all' | 'any'>('all');
  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [previewResults, setPreviewResults] = useState<CustomerFactsRow[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [saving, setSaving] = useState(false);

  const [viewingSegment, setViewingSegment] = useState<{ segment: SavedSegment; results: CustomerFactsRow[] } | null>(
    null,
  );

  if (!session) {
    return null;
  }

  async function loadCatalog() {
    setLoadingCatalog(true);
    setError(null);
    try {
      const [f, cats, saved] = await Promise.all([
        api.getSegmentFields(session!.token),
        api.getProductCategories(session!.token),
        api.listCustomSegments(session!.token),
      ]);
      setFields(f);
      setCategories(cats);
      setSavedSegments(saved);
      setConditions([defaultCondition(f)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoadingCatalog(false);
    }
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCondition(index: number, patch: Partial<SegmentCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function fieldChanged(index: number, fieldKey: string) {
    const def = fields.find((f) => f.key === fieldKey)!;
    updateCondition(index, { field: def.key, operator: def.operators[0], value: '', value2: undefined });
  }

  function addCondition() {
    setConditions((prev) => [...prev, defaultCondition(fields)]);
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    try {
      const results = await api.previewCustomSegment(session!.token, {
        periodDays: Number(periodDays),
        matchType,
        conditions,
      });
      setPreviewResults(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.createCustomSegment(session!.token, {
        name: segmentName,
        periodDays: Number(periodDays),
        matchType,
        conditions,
      });
      setSegmentName('');
      const saved = await api.listCustomSegments(session!.token);
      setSavedSegments(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  async function viewSaved(id: string) {
    setError(null);
    try {
      const data = await api.getCustomSegmentResults(session!.token, id);
      setViewingSegment(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  async function deleteSaved(id: string) {
    try {
      await api.deleteCustomSegment(session!.token, id);
      if (viewingSegment?.segment.id === id) setViewingSegment(null);
      setSavedSegments((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  if (loadingCatalog) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="section">
        <h3>Constructor de filtros</h3>
        <div className="inline-form" style={{ marginBottom: '1rem' }}>
          <div className="field">
            <label>Periodo (días)</label>
            <input type="number" min="1" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} />
          </div>
          <div className="field">
            <label>Coincidencia</label>
            <select value={matchType} onChange={(e) => setMatchType(e.target.value as 'all' | 'any')}>
              <option value="all">Se cumplen TODAS las condiciones</option>
              <option value="any">Se cumple ALGUNA condición</option>
            </select>
          </div>
        </div>

        {conditions.map((cond, index) => {
          const def = fields.find((f) => f.key === cond.field)!;
          return (
            <div key={index} className="inline-form" style={{ marginBottom: '0.6rem' }}>
              <div className="field">
                <label>Campo</label>
                <select value={cond.field} onChange={(e) => fieldChanged(index, e.target.value)}>
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Operador</label>
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(index, { operator: e.target.value as SegmentOperator })}
                >
                  {def.operators.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Valor</label>
                {def.type === 'category' ? (
                  <select value={cond.value} onChange={(e) => updateCondition(index, { value: e.target.value })}>
                    <option value="">Selecciona...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={cond.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                  />
                )}
              </div>
              {cond.operator === 'between' && (
                <div className="field">
                  <label>y</label>
                  <input
                    type="number"
                    value={cond.value2 ?? ''}
                    onChange={(e) => updateCondition(index, { value2: e.target.value })}
                  />
                </div>
              )}
              {conditions.length > 1 && (
                <button type="button" className="delete-link" onClick={() => removeCondition(index)}>
                  Quitar
                </button>
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={addCondition}>
            + Añadir condición
          </button>
          <button type="button" onClick={handlePreview} disabled={previewing}>
            {previewing ? 'Calculando...' : 'Previsualizar'}
          </button>
        </div>

        {previewResults && (
          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>{previewResults.length}</strong> cliente(s) coinciden.
            </p>
            <ResultsTable rows={previewResults} />
            <div className="inline-form" style={{ marginTop: '1rem' }}>
              <div className="field">
                <label>Nombre para guardar este filtro</label>
                <input value={segmentName} onChange={(e) => setSegmentName(e.target.value)} placeholder="ej. Compradores frecuentes" />
              </div>
              <button type="button" onClick={handleSave} disabled={saving || !segmentName.trim()}>
                {saving ? 'Guardando...' : 'Guardar filtro'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Filtros guardados</h3>
        {savedSegments.length === 0 ? (
          <div className="empty-state">Todavía no has guardado ningún filtro.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Periodo</th>
                <th>Condiciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {savedSegments.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.periodDays} días</td>
                  <td>
                    {s.conditions.length} ({s.matchType === 'all' ? 'todas' : 'alguna'})
                  </td>
                  <td style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => viewSaved(s.id)}>
                      Ver resultados
                    </button>
                    <button type="button" className="delete-link" onClick={() => deleteSaved(s.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {viewingSegment && (
          <div style={{ marginTop: '1rem' }}>
            <h3>
              Resultados de "{viewingSegment.segment.name}" ({viewingSegment.results.length})
            </h3>
            <ResultsTable rows={viewingSegment.results} />
          </div>
        )}
      </div>
    </div>
  );
}
