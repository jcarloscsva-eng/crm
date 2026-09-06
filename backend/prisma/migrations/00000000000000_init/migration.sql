-- ============================================================================
-- Migración inicial: esquema multi-tenant con aislamiento por Row-Level Security
--
-- Patrón de seguridad: cada tabla con datos de un negocio lleva "tenant_id".
-- Las políticas RLS obligan a que toda consulta filtre por el tenant activo
-- de la sesión (variable "app.tenant_id"), aunque el código de la aplicación
-- tenga un bug y olvide añadir el filtro manualmente.
--
-- IMPORTANTE: RLS no protege nada si la conexión usa un rol superusuario
-- (bypassa RLS por defecto). Por eso creamos "app_role", un rol SIN privilegio
-- de superusuario, y es el único que debe usar el backend para conectarse.
-- El rol de administración de Postgres (POSTGRES_USER en docker-compose) solo
-- se usa para aplicar migraciones.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Rol de aplicación (sin bypass de RLS)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_role') THEN
    CREATE ROLE app_role LOGIN PASSWORD 'app_role_dev_password_change_me' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE, CREATE ON SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;

-- ----------------------------------------------------------------------------
-- Tenants (negocios)
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE, -- identificador público usado para el login (ej. "peluqueria-marisa")
  name          TEXT NOT NULL,
  business_type TEXT, -- 'peluqueria', 'taller', 'centro_estetica', 'cristaleria', 'toldos', ...
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

-- Esta tabla NO contiene datos de clientes, solo el registro del negocio en sí
-- (nombre, slug, tipo). Por eso la lectura es pública: el login necesita poder
-- localizar un tenant por su slug antes de que exista sesión con tenant_id fijado.
CREATE POLICY tenant_public_read ON tenants
  FOR SELECT USING (true);

-- Cualquiera puede registrar un negocio nuevo (alta pública de tenant).
CREATE POLICY tenant_public_insert ON tenants
  FOR INSERT WITH CHECK (true);

-- Pero solo se puede modificar el propio tenant, una vez autenticado.
CREATE POLICY tenant_update_own ON tenants
  FOR UPDATE USING (id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);

-- ----------------------------------------------------------------------------
-- Usuarios (empleados del negocio, con rol)
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'employee');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ----------------------------------------------------------------------------
-- Configuración de puntos por negocio (cada negocio define su propia regla)
-- ----------------------------------------------------------------------------
CREATE TABLE points_config (
  tenant_id                UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  points_per_currency_unit NUMERIC(10,4) NOT NULL DEFAULT 1,
  min_purchase_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_config FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON points_config
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ----------------------------------------------------------------------------
-- Clientes
-- custom_fields permite adaptar el modelo a cada sector (ej. "tipo_piel" en
-- un centro de estética, "modelo_vehiculo" en un taller) sin cambiar el esquema.
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  points_balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  custom_fields     JSONB NOT NULL DEFAULT '{}',
  consent_marketing BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ -- borrado lógico: permite trazabilidad antes de un borrado definitivo (derecho al olvido)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- ----------------------------------------------------------------------------
-- Interacciones (llamadas, visitas)
-- ----------------------------------------------------------------------------
CREATE TYPE interaction_type AS ENUM ('call', 'visit');

CREATE TABLE interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        interaction_type NOT NULL,
  notes       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON interactions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_interactions_tenant_customer ON interactions(tenant_id, customer_id);
CREATE INDEX idx_interactions_occurred_at ON interactions(occurred_at);

-- ----------------------------------------------------------------------------
-- Compras (tickets) — generan puntos según points_config del tenant
-- ----------------------------------------------------------------------------
CREATE TABLE purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  points_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON purchases
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_purchases_tenant_customer ON purchases(tenant_id, customer_id);
CREATE INDEX idx_purchases_occurred_at ON purchases(occurred_at);

-- ----------------------------------------------------------------------------
-- Devoluciones
-- ----------------------------------------------------------------------------
CREATE TABLE returns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_id      UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount           NUMERIC(12,2) NOT NULL,
  points_reversed  NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason           TEXT,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON returns
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_returns_tenant_customer ON returns(tenant_id, customer_id);

-- ----------------------------------------------------------------------------
-- Auditoría (quién hizo qué, sobre qué dato de cliente)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at);
