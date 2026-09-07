-- Catálogo de productos por negocio, y líneas de compra (purchase_items)
-- para poder analizar qué se vende más. Antes, "purchases" solo tenía un
-- importe suelto; ahora ese importe se sigue guardando (para no romper el
-- cálculo de puntos ni las devoluciones, que ya funcionan sobre el total),
-- pero se calcula como la suma de sus líneas de producto.

CREATE TABLE products (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  category   TEXT,
  price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_products_tenant ON products(tenant_id);

CREATE TABLE purchase_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    NUMERIC(12,2) NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL, -- precio en el momento de la venta (el producto puede cambiar de precio despues)
  subtotal    NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON purchase_items
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_purchase_items_tenant_purchase ON purchase_items(tenant_id, purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(tenant_id, product_id);
