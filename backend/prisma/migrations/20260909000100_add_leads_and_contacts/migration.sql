-- Leads (embudo de ventas) y contacts (partners / contactos interesantes).
-- Deliberadamente separados de "customers": un lead o un contacto no
-- tiene historial de compras ni puntos — solo lo tiene un cliente real.
-- Un lead ganado se puede convertir en cliente (converted_customer_id).
--
-- Usa desde el principio el patrón NULLIF corregido en
-- 20260907001100_fix_rls_empty_string_tenant_id.

CREATE TYPE lead_stage AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

CREATE TABLE leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  company              TEXT,
  email                TEXT,
  phone                TEXT,
  linkedin_url         TEXT,
  estimated_value      NUMERIC(12,2),
  stage                lead_stage NOT NULL DEFAULT 'new',
  notes                TEXT,
  source               TEXT, -- 'manual', 'linkedin_extension', ...
  converted_customer_id UUID REFERENCES customers(id),
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE INDEX idx_leads_tenant_stage ON leads(tenant_id, stage);

CREATE TYPE contact_category AS ENUM ('partner', 'interesting');

CREATE TABLE contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category     contact_category NOT NULL,
  full_name    TEXT NOT NULL,
  company      TEXT,
  email        TEXT,
  phone        TEXT,
  linkedin_url TEXT,
  notes        TEXT,
  source       TEXT, -- 'manual', 'linkedin_extension', ...
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contacts
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE INDEX idx_contacts_tenant_category ON contacts(tenant_id, category);
