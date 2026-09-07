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

### Bug real encontrado: `current_setting` devuelve `''`, no `NULL`, en una conexión reutilizada

Al construir `platform-admin` (una consulta que deliberadamente no fija
ningún tenant, porque lista negocios de *todos*), apareció un 500 en vez
de la respuesta esperada. La causa, reproducida directamente en `psql`:

```sql
BEGIN;
SELECT set_config('app.tenant_id', '<algún-uuid>', true); -- SET LOCAL
COMMIT;
SELECT current_setting('app.tenant_id', true); -- ¡devuelve '', no NULL!
```

En una conexión de Postgres que **nunca** ha tocado `app.tenant_id`,
`current_setting(..., true)` devuelve `NULL` limpio (confirmado también
en `psql`). Pero en cuanto esa variable se ha fijado una vez en la
conexión — aunque sea con `SET LOCAL`/`set_config(..., true)`, que
revierte al terminar la transacción — Postgres no la "olvida": el
"revertir" es a una cadena vacía `''`, no a "sin fijar". Y `''::uuid` no
es `NULL`, es un **error de casteo** que Postgres lanza de inmediato.

Con Prisma reutilizando conexiones de un pool, esto significa que
`WITH TENANT` funciona perfecto siempre, pero cualquier consulta que
toque una tabla con RLS **fuera** de `withTenant()` podía romperse con
un 500 real (no con "0 filas", que era la intención de diseño) en cuanto
esa conexión física ya se hubiera usado antes para algún tenant — es
decir, de forma intermitente y dependiente del estado del pool, el tipo
de bug más difícil de reproducir y más fácil de no detectar en pruebas
manuales rápidas.

**Arreglo** (migración `20260907001100_fix_rls_empty_string_tenant_id`):
todas las políticas RLS pasaron de

```sql
tenant_id = current_setting('app.tenant_id', true)::uuid
```

a

```sql
tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
```

`NULLIF(x, '')` convierte la cadena vacía en `NULL` de verdad antes de
castear, y `tenant_id = NULL` vuelve a evaluar a `NULL` (ninguna fila) —
el fail-closed que se buscaba desde el principio, ahora sin el error de
casteo intermedio. Verificado reaplicando las 5 migraciones desde una
base de datos vacía y repitiendo las pruebas de aislamiento.

Lección para el futuro: cualquier política RLS nueva en este proyecto
debe usar `NULLIF(current_setting(...), '')`, nunca
`current_setting(...)` a secas.

## Autenticación y autorización

- **Login**: `{ slug, email, password }` → el `slug` identifica el negocio
  (ej. `peluqueria-marisa`), porque un mismo email puede repetirse entre
  negocios distintos.
- **JWT**: firmado con `JWT_SECRET`, payload con `{ sub: userId, tenantId,
  email, role }`, expira a las 8 horas.
- **Guards globales**: por defecto, toda ruta exige un JWT válido
  (`JwtAuthGuard`) y, cuando así se declara con `@Roles(...)`, un rol
  concreto (`RolesGuard`). Las rutas públicas (`/auth/login`,
  `/platform-admin/login`) se marcan explícitamente con `@Public()` — el
  valor por defecto es "cerrado", no "abierto".
- **Contraseñas**: hasheadas con `bcryptjs` (12 rondas). Se usa la variante
  pura en JavaScript (en vez de `argon2` o `bcrypt` nativos) para evitar
  depender de compilación de módulos nativos en este proyecto de práctica;
  en un uso real conviene evaluar `argon2`.

## Administrador de la plataforma

Decisión: no hay auto-registro público de negocios. Solo tú (el operador
de la app) decides qué negocios existen, y creas su usuario `owner`
inicial — desde ahí, ese owner ya gestiona sus propios empleados como
siempre.

Esto introduce un tercer tipo de identidad, **fuera** del modelo
multi-tenant a propósito:

- Tabla `platform_admins`, **sin** Row-Level Security. RLS aísla datos
  *entre* tenants; esto no es un dato de tenant, es el nivel por encima
  de todos ellos — no hay "tenant activo" que aplicarle. Se protege por
  diseño de aplicación (solo el módulo `platform-admin` la toca), no por
  RLS.
- Tu cuenta se siembra sola al arrancar el backend, desde
  `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` (upsert en
  `PlatformAdminService.onModuleInit`) — no existe ningún endpoint para
  crear administradores de plataforma. Cambiar la contraseña es cambiar
  la variable de entorno y reiniciar.
- Login separado (`POST /platform-admin/login`) que emite un JWT con
  **un secreto de firma distinto** (`PLATFORM_ADMIN_JWT_SECRET`, no
  `JWT_SECRET`) y un payload con forma distinta (`{ sub, email, scope:
  'platform_admin' }`, sin `tenantId` ni `role`). Es defensa en
  profundidad real, no solo cosmética: aunque hubiera un bug en cómo se
  aplican los guards, un token de un tipo no puede validar contra el
  secreto del otro — la verificación de firma falla antes de mirar el
  contenido. Verificado con pruebas: un token de owner de negocio da 401
  en rutas de `platform-admin`, y viceversa.
- `POST /platform-admin/tenants` crea el tenant + su usuario owner (la
  misma lógica que antes vivía en el registro público), protegido por
  `PlatformAdminGuard`. `GET /platform-admin/tenants` lista todos los
  negocios con su recuento de usuarios/clientes (ver el bug de RLS más
  abajo, relevante aquí).
- El frontend trata esto como una aplicación separada de facto
  (`RootApp.tsx`): sesión propia en `localStorage` bajo otra clave,
  sin relación con el `AuthContext` de los usuarios de negocio.

## Modelo de datos

Ver `backend/prisma/schema.prisma` y las migraciones en
`backend/prisma/migrations/` (fuente de verdad, incluyen las políticas RLS
que Prisma no modela de forma nativa). **Importante**: una vez que una
migración se ha aplicado alguna vez (incluida la del propio usuario en su
Docker local), no se edita — los cambios de esquema posteriores van en un
directorio de migración nuevo, para que `prisma migrate deploy` los
detecte y aplique sobre una base de datos que ya tiene datos.

Tablas: `tenants`, `users`, `points_config`, `customers`, `interactions`,
`products`, `purchases`, `purchase_items`, `returns`, `audit_log`.

`customers.custom_fields` es JSONB para permitir que cada negocio añada
campos propios de su sector sin necesitar una migración de esquema.

## Productos y compras itemizadas

Las compras dejaron de ser un importe suelto: cada `purchase` tiene una o
varias `purchase_items` (producto + cantidad + precio en el momento de la
venta). El precio se copia a la línea en el momento de la compra
(`purchase_items.unit_price`) en vez de leerse siempre de `products.price`,
para que un cambio de precio futuro no altere el histórico de ventas ya
registradas. `purchases.amount` se sigue guardando (ahora calculado como
la suma de las líneas) para no romper el cálculo de puntos ni las
devoluciones, que ya trabajaban sobre el total.

Un producto no se borra nunca físicamente (rompería el historial de
`purchase_items`, que lo referencia); se desactiva (`products.active =
false`), igual que el borrado lógico de clientes.

## Llamadas comerciales con resultado

`interactions.outcome` (`sale_closed` / `interested` / `not_interested` /
`call_back`) y `interactions.follow_up_at` son columnas nuevas, nulas para
visitas — el backend rechaza con 400 cualquier intento de fijar `outcome`
o `followUpAt` en una interacción que no sea de tipo `call`.

## Reportes

`GET /reports/customers` y `GET /reports/products` (solo owner/admin):
top clientes por gasto neto (compras menos devoluciones, no gasto bruto)
y por puntos acumulados; productos más vendidos por cantidad y por
ingresos. Igual que en segmentos, son agregaciones SQL directas sobre
`purchases`/`returns`/`purchase_items`, no vistas materializadas — a este
volumen de datos no hace falta esa complejidad.

## Puntos, compras y devoluciones

- `POST /customers/:id/purchases` calcula los puntos dentro de la misma
  transacción que crea la compra y actualiza `customers.points_balance`
  (usando `increment` atómico de Prisma, no una lectura-y-escritura
  separada que podría perder una actualización concurrente).
- Regla: si `amount >= points_config.minPurchaseAmount`, se otorgan
  `amount * points_config.pointsPerCurrencyUnit` puntos; si no, 0. El
  `amount` es ahora la suma de las líneas de producto de la compra.
- `POST /customers/:id/purchases/:purchaseId/returns` sigue dos reglas:
  1. No se puede devolver más de lo que queda por devolver de esa compra
     (importe de la compra menos la suma de devoluciones previas) — se
     valida antes de aceptar la devolución, en la misma transacción.
  2. Los puntos se revierten en la misma proporción que se devuelve del
     importe (una devolución del 40% del importe revierte el 40% de los
     puntos que esa compra había generado), no de forma fija.
- Los cálculos de dinero y puntos se hacen convirtiendo los `Decimal` de
  Prisma a `number` de JavaScript y redondeando a 2 decimales. Es una
  simplificación deliberada aceptable para un CRM de práctica; para un
  sistema con más volumen o más precisión monetaria requerida, convendría
  operar con una librería decimal (ej. `decimal.js`, que Prisma ya usa
  internamente) en vez de `number`.

## Segmentos pre-creados

`GET /segments` (solo `owner`/`admin`) calcula los tres segmentos pedidos
al inicio del proyecto con una única consulta SQL (`segments.service.ts`),
comparando dos periodos de 12 meses (el actual y el inmediatamente
anterior):

- **Visitas disminuidas**: clientes cuyo número de interacciones de tipo
  `visit` en los últimos 12 meses es menor que en los 12 meses anteriores.
- **Gasto medio por visita aumentado / disminuido**: compara
  `(total comprado en el periodo) / (visitas en el periodo)` entre ambos
  periodos.

Dos definiciones que son elección nuestra, no un estándar universal, y
que quedan documentadas en el propio código para que sean explícitas:
- "El último año" = los últimos 12 meses frente a los 12 meses anteriores
  a esos (no un año natural).
- "Gasto medio por visita" = gasto total del periodo entre número de
  visitas del periodo, no un promedio por ticket individual — el esquema
  no liga cada compra a una visita concreta, así que es una media
  agregada, no un cálculo 1 a 1.

Un cliente sin visitas en el periodo anterior (recién dado de alta) no
puede tener una media de gasto "anterior", así que queda excluido de los
segmentos de aumento/disminución de gasto (no se puede comparar contra
un dato que no existe) — solo puede aparecer en "visitas disminuidas" si
además tenía visitas antes y ahora tiene menos, lo cual por definición
no le pasa a un cliente nuevo.

## Frontend

Cubre todo el backend descrito arriba: registro de negocio, login,
clientes (con búsqueda por nombre/teléfono/email), ficha de cliente
(interacciones y llamadas con resultado estructurado, compras itemizadas
con selector de productos, devoluciones), catálogo de productos, reglas
de puntos, segmentos y reportes (clientes y productos). Un botón de
acción rápida flotante (`+`), presente en toda la app vía `AppLayout`,
permite crear un cliente, registrar una llamada, o saltar directo a la
ficha de un cliente para una compra, sin tener que navegar primero por
el listado — con búsqueda de cliente integrada en el propio modal.

Probado en Chromium con Playwright de punta a punta en dos rondas:
la primera cubriendo login/registro/clientes/puntos/devoluciones/segmentos
(verificando números exactos: compra de 40€ a 3 puntos/€ → 120 puntos;
devolución del 50% → 60 puntos), y la segunda cubriendo productos, compras
con varias líneas (verificado que 3×25€ + 1×40€ = 115€ tanto en el
carrito como en el reporte de gasto neto), llamadas con resultado,
búsqueda de clientes, y el flujo completo del botón de acción rápida.

## Lo que falta por construir

- **Edición de clientes desde la UI**: la API ya soporta `PATCH
  /customers/:id`, falta el formulario en el frontend.
- **Precio unitario editable en el frontend**: la API de compras admite
  `unitPrice` por línea (para descuentos puntuales), pero la UI siempre
  usa el precio actual del producto.
- **RGPD más completo**: hoy hay borrado lógico, consentimiento de
  marketing y auditoría; falta un endpoint de exportación de datos del
  cliente (portabilidad) y un proceso de purga física tras un plazo.
