import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError, Product } from '../api';
import { useAuth } from '../AuthContext';
import { AppLayout, View } from '../components/AppLayout';

export function ProductsPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [creating, setCreating] = useState(false);

  if (!session) {
    return null;
  }
  const canManage = session.user.role === 'owner' || session.user.role === 'admin';

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProducts(session!.token, true);
      setProducts(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createProduct(session!.token, { name, category: category || undefined, price: Number(price) });
      setName('');
      setCategory('');
      setPrice('');
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api.updateProduct(session!.token, product.id, { active: !product.active });
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
    }
  }

  return (
    <AppLayout active="products" onNavigate={onNavigate}>
      <h2>Productos</h2>
      {error && <div className="error-banner">{error}</div>}

      {canManage && (
        <form className="new-customer-form" onSubmit={handleCreate}>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Categoría</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="opcional" />
          </div>
          <div className="field">
            <label>Precio (€)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <button type="submit" disabled={creating}>
            {creating ? 'Guardando...' : 'Añadir producto'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">Todavía no hay productos.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category ?? '—'}</td>
                <td>{p.price} €</td>
                <td>{p.active ? 'Activo' : 'Inactivo'}</td>
                {canManage && (
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => toggleActive(p)}>
                      {p.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppLayout>
  );
}
