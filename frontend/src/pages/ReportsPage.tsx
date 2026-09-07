import { useEffect, useState } from 'react';
import { api, ApiError, CustomerReport, ProductReport } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

export function ReportsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [tab, setTab] = useState<'customers' | 'products'>('customers');
  const [customerReport, setCustomerReport] = useState<CustomerReport | null>(null);
  const [productReport, setProductReport] = useState<ProductReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return null;
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getCustomerReport(session.token), api.getProductReport(session.token)])
      .then(([c, p]) => {
        setCustomerReport(c);
        setProductReport(p);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout active="reports" onNavigate={onNavigate}>
      <h2>Reportes</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="report-tabs">
        <button type="button" className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>
          Clientes
        </button>
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Compras de productos
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : tab === 'customers' && customerReport ? (
        <>
          <div className="points-summary">
            <div className="stat">
              <div className="value">{customerReport.totalCustomers}</div>
              <div className="label">Clientes totales</div>
            </div>
            <div className="stat">
              <div className="value">{customerReport.newThisMonth}</div>
              <div className="label">Nuevos este mes</div>
            </div>
          </div>

          <div className="section">
            <h3>Top clientes por gasto neto (compras − devoluciones)</h3>
            {customerReport.topBySpend.length === 0 ? (
              <div className="empty-state">Sin datos todavía.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Gasto bruto</th>
                    <th>Devuelto</th>
                    <th>Gasto neto</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReport.topBySpend.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fullName}</td>
                      <td>{c.grossSpend.toFixed(2)} €</td>
                      <td>{c.totalReturned.toFixed(2)} €</td>
                      <td>{c.netSpend.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h3>Top clientes por puntos acumulados</h3>
            {customerReport.topByPoints.length === 0 ? (
              <div className="empty-state">Sin datos todavía.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReport.topByPoints.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fullName}</td>
                      <td>{c.pointsBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : tab === 'products' && productReport ? (
        <>
          <div className="points-summary">
            <div className="stat">
              <div className="value">{productReport.totalActiveProducts}</div>
              <div className="label">Productos activos</div>
            </div>
          </div>

          <div className="section">
            <h3>Más vendidos por cantidad</h3>
            {productReport.topByQuantity.length === 0 ? (
              <div className="empty-state">Sin ventas todavía.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Cantidad vendida</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {productReport.topByQuantity.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category ?? '—'}</td>
                      <td>{p.totalQuantity}</td>
                      <td>{p.totalRevenue.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="section">
            <h3>Más vendidos por ingresos</h3>
            {productReport.topByRevenue.length === 0 ? (
              <div className="empty-state">Sin ventas todavía.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Ingresos</th>
                    <th>Cantidad vendida</th>
                  </tr>
                </thead>
                <tbody>
                  {productReport.topByRevenue.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category ?? '—'}</td>
                      <td>{p.totalRevenue.toFixed(2)} €</td>
                      <td>{p.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}
