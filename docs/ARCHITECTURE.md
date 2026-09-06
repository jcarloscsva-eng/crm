# Arquitectura

## Contexto y decisiones ya tomadas

- **Multi-tenant**: una única aplicación sirve a varios negocios distintos,
  con los datos aislados entre sí.
- **Self-hosted vía Docker**, no un servicio cloud de terceros (evita
  depender de límites de un plan gratuito externo cuyo estado actual no
  podemos verificar con certeza).
- **Roles**: cada negocio tiene empleados con roles distintos
  (`owner`, `admin`, `employee`).
- **Reglas de puntos configurables por negocio**, no fijas en el código.
- **Seguridad**: buenas prácticas básicas + simulación de cumplimiento
  tipo RGPD (borrado lógico con trazabilidad, consentimiento de marketing,
  registro de auditoría).
- **Extensibilidad por sector**: el modelo de cliente es genérico pero
  admite campos personalizados (ej. "tipo de piel" en un centro de
  estética) sin cambiar el esquema de base de datos.

## Aislamiento multi-tenant: Row-Level Security, no solo código

La decisión de seguridad más importante del proyecto: el aislamiento entre
negocios **no depende de que el código de la aplicación recuerde añadir
`WHERE tenant_id = ...`** en cada consulta. Se aplica a nivel de base de
datos con Row-Level Security (RLS) de PostgreSQL:

1. Cada tabla con datos de un negocio (`customers`, `users`, `interactions`,
   `purchases`, `returns`, `points_config`, `audit_log`) tiene una columna
   `tenant_id` y una política RLS:
   ```sql
   CREATE POLICY tenant_isolation ON customers
     USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
     WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
   ```
2. Antes de cada operación, el backend fija esa variable de sesión al
   tenant del usuario autenticado (ver `PrismaService.withTenant()` en
   `backend/src/prisma/prisma.service.ts`), dentro de una transacción.
3. **Fail-closed**: si la variable no está fijada (código con un bug, o un
   acceso fuera de este mecanismo), Postgres no devuelve ninguna fila — no
   hay un "modo por defecto" que muestre todo.
4. **Importante**: RLS no protege nada si la conexión usa un rol
   superusuario, porque estos lo saltan (bypass) por defecto. Por eso existe
   un rol separado, `app_role`, creado en la propia migración
   (`NOSUPERUSER NOBYPASSRLS`), que es el único que debe usar el backend en
   producción. El rol administrador de Postgres solo se usa para aplicar
   migraciones.
5. La tabla `tenants` es la única excepción parcial: no contiene datos de
   clientes, solo el registro del negocio en sí (nombre, slug, tipo), así
   que su lectura es pública — es necesaria para que el login pueda
   localizar un negocio por su `slug` antes de que exista una sesión con
   tenant fijado. La escritura sigue restringida (alta pública permitida,
   modificación solo del propio tenant).

Esto se verificó con pruebas reales, no solo revisando el código:
conectando como `app_role` (no como superusuario), se comprobó que:
- un tenant solo ve sus propias filas;
- un intento de insertar una fila con el `tenant_id` de otro negocio es
  rechazado por Postgres (`new row violates row-level security policy`);
- sin la variable de tenant fijada, cualquier lectura devuelve 0 filas.

Después, se repitió la misma prueba a través de la API HTTP completa
(registro de dos negocios, creación de clientes en cada uno, y verificación
de que ninguno puede leer los datos del otro, ni siquiera pidiendo el ID
exacto del recurso de otro tenant — responde 404, no 403, para no revelar
que el recurso existe).

## Autenticación y autorización

- **Login**: `{ slug, email, password }` → el `slug` identifica el negocio
  (ej. `peluqueria-marisa`), porque un mismo email puede repetirse entre
  negocios distintos.
- **JWT**: firmado con `JWT_SECRET`, payload con `{ sub: userId, tenantId,
  email, role }`, expira a las 8 horas.
- **Guards globales**: por defecto, toda ruta exige un JWT válido
  (`JwtAuthGuard`) y, cuando así se declara con `@Roles(...)`, un rol
  concreto (`RolesGuard`). Las rutas públicas (`/auth/register-tenant`,
  `/auth/login`) se marcan explícitamente con `@Public()` — el valor por
  defecto es "cerrado", no "abierto".
- **Contraseñas**: hasheadas con `bcryptjs` (12 rondas). Se usa la variante
  pura en JavaScript (en vez de `argon2` o `bcrypt` nativos) para evitar
  depender de compilación de módulos nativos en este proyecto de práctica;
  en un uso real conviene evaluar `argon2`.

## Modelo de datos

Ver `backend/prisma/schema.prisma` y la migración
`backend/prisma/migrations/00000000000000_init/migration.sql` (fuente de
verdad, incluye las políticas RLS que Prisma no modela de forma nativa).

Tablas: `tenants`, `users`, `points_config`, `customers`, `interactions`,
`purchases`, `returns`, `audit_log`.

`customers.custom_fields` es JSONB para permitir que cada negocio añada
campos propios de su sector sin necesitar una migración de esquema.

## Lo que falta por construir

- **Interacciones** (llamadas/visitas): tabla ya creada, falta CRUD.
- **Compras y devoluciones**, con el cálculo de puntos según
  `points_config` de cada tenant (tabla ya creada).
- **Segmentos pre-creados**: requieren comparar periodos (ej. visitas del
  último año vs. el anterior, gasto medio por visita en aumento/disminución).
  Se implementarán como consultas SQL (o vistas materializadas) sobre
  `interactions` y `purchases`, agrupando por cliente y periodo.
- **Frontend**: ya cubre registro de negocio, login y CRUD básico de
  clientes (probado en Chromium con Playwright: registro → alta de
  cliente → refresh de página → logout → login → el cliente sigue
  visible). Falta añadir las pantallas de registro de interacciones y
  vista de segmentos, en cuanto existan en el backend.
- **RGPD más completo**: hoy hay borrado lógico, consentimiento de
  marketing y auditoría; falta un endpoint de exportación de datos del
  cliente (portabilidad) y un proceso de purga física tras un plazo.
