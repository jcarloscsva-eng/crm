-- Administradores de la plataforma: tú, el operador de la app. Viven FUERA
-- del modelo multi-tenant a propósito — no pertenecen a ningún negocio,
-- son quienes deciden qué negocios pueden existir.
--
-- Por eso esta tabla NO tiene Row-Level Security: RLS aísla datos ENTRE
-- tenants (current_setting('app.tenant_id')), y esto no es un dato de
-- tenant, es el nivel por encima de todos ellos — no hay "tenant activo"
-- que aplicar aquí. Se protege en su lugar a nivel de aplicación: solo el
-- módulo platform-admin la toca, con su propio guard y su propio secreto
-- de JWT (distinto al de los usuarios de negocio), y no existe ningún
-- endpoint público para crear filas en esta tabla — se siembra desde
-- variables de entorno al arrancar el servidor.
CREATE TABLE platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
