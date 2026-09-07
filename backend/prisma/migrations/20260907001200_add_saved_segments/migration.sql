-- Segmentos personalizados guardados por el negocio (el "constructor
-- acotado" de filtros). "conditions" guarda el filtro en JSON en vez de
-- normalizarlo en filas: son datos de configuración leídos siempre en
-- bloque para recalcular resultados, nunca consultados campo a campo.
--
-- Usa desde el principio el patrón NULLIF corregido en
-- 20260907001100_fix_rls_empty_string_tenant_id (ver esa migración para
-- el porqué: current_setting(...) puede devolver '' en vez de NULL en una
-- conexión reutilizada, y ''::uuid revienta el casteo en vez de fallar
-- limpiamente a "ninguna fila").
CREATE TABLE saved_segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  period_days INTEGER NOT NULL DEFAULT 90,
  match_type  TEXT NOT NULL DEFAULT 'all' CHECK (match_type IN ('all', 'any')),
  conditions  JSONB NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saved_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_segments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON saved_segments
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE INDEX idx_saved_segments_tenant ON saved_segments(tenant_id);
