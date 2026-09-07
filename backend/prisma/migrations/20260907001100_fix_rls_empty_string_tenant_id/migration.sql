-- BUG REAL encontrado al construir platform-admin: en una conexión de
-- Postgres reutilizada por el pool, una vez que "app.tenant_id" se ha
-- fijado alguna vez en esa conexión (aunque sea con SET LOCAL, que revierte
-- al terminar la transacción), current_setting('app.tenant_id', true)
-- deja de devolver NULL cuando "no hay tenant fijado" — devuelve una
-- cadena vacía ''. Y ''::uuid no es NULL, es un ERROR de casteo
-- ("invalid input syntax for type uuid"). Eso rompía (con 500, no con
-- 0 filas) cualquier consulta fuera de withTenant() que tocara una tabla
-- con RLS, en cuanto esa conexión ya se hubiera usado antes para un
-- tenant. Fail-closed dejaba de funcionar como "0 filas" y pasaba a ser
-- un error real.
--
-- Arreglo: envolver current_setting(...) en NULLIF(..., '') antes de
-- castear a uuid, en TODAS las políticas que lo usan. NULLIF convierte
-- la cadena vacía en NULL de verdad, y tenant_id = NULL vuelve a evaluar
-- a NULL (ninguna fila), que es el comportamiento fail-closed que
-- buscábamos desde el principio.

DROP POLICY tenant_update_own ON tenants;
CREATE POLICY tenant_update_own ON tenants
  FOR UPDATE USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON points_config;
CREATE POLICY tenant_isolation ON points_config
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON customers;
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON interactions;
CREATE POLICY tenant_isolation ON interactions
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON purchases;
CREATE POLICY tenant_isolation ON purchases
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON returns;
CREATE POLICY tenant_isolation ON returns
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON products;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY tenant_isolation ON purchase_items;
CREATE POLICY tenant_isolation ON purchase_items
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
