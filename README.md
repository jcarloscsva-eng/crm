# CRM para pymes locales (proyecto de práctica)

CRM multi-tenant pensado para pequeños negocios locales (peluquerías, talleres,
centros de estética, cristalerías, tiendas de ventanas/toldos, etc.): alta de
clientes, registro de interacciones (llamadas, visitas), compras, devoluciones,
puntos de fidelización configurables por negocio y segmentos de clientes
pre-calculados.

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para las decisiones de
arquitectura y seguridad, y por qué se tomaron.

## Estado actual

Construido y probado de punta a punta:
- Modelo de datos multi-tenant con Row-Level Security en Postgres.
- **Alta de negocios controlada**: no hay registro público. Solo tu cuenta
  de administrador de la plataforma (sembrada desde variables de entorno)
  puede autorizar un negocio nuevo y crear su usuario `owner` inicial —
  con su propio login, JWT y guard, completamente separados de los
  usuarios de negocio (secreto de firma distinto, ningún token de un tipo
  sirve para rutas del otro).
- Login de usuarios de negocio con JWT.
- Roles por negocio (`owner`, `admin`, `employee`) con control de acceso.
- CRUD de clientes con campos personalizables por sector (`custom_fields`).
- Registro de auditoría sobre cambios en clientes.
- Interacciones (llamadas/visitas) por cliente.
- Compras con cálculo automático de puntos según la configuración de cada
  negocio (puntos por unidad de moneda, importe mínimo de compra).
- Devoluciones con reversión proporcional de puntos y validación de que no
  se devuelva más de lo comprado.
- Los 3 segmentos pre-creados pedidos al inicio: clientes con visitas
  disminuidas, con gasto medio por visita aumentado, y con gasto medio por
  visita disminuido (comparando los últimos 12 meses contra los 12
  anteriores).
- Catálogo de productos (nombre, categoría, precio) por negocio.
- Compras itemizadas: cada compra tiene una o varias líneas de producto
  (cantidad + precio en el momento de la venta), y el total/puntos se
  calculan a partir de esas líneas.
- Llamadas comerciales con resultado estructurado (venta cerrada /
  interesado / sin interés / volver a llamar) y fecha de seguimiento
  opcional.
- Reportes (`GET /reports/customers`, `GET /reports/products`): top
  clientes por gasto neto y por puntos, productos más vendidos por
  cantidad e ingresos.
- Búsqueda de clientes por nombre/teléfono/email (`GET /customers?q=`).
- Frontend (React + Vite) completo, incluidas las funciones de arriba:
  pantalla separada de administrador de la plataforma (autorizar negocios,
  ver cuántos usuarios/clientes tiene cada uno), login de negocio, clientes
  (con búsqueda), ficha de cliente (interacciones/llamadas con resultado,
  compras itemizadas con productos, devoluciones), catálogo de productos,
  reglas de puntos, segmentos, reportes, y un botón de acción rápida
  flotante (nuevo cliente / nueva llamada / nueva compra) visible en toda
  la app. Sesión persistida en el navegador. Probado en Chromium real de
  punta a punta.

Pendiente (próximas iteraciones):
- Exportación de datos de un cliente y purga física (RGPD más completo).
- Edición de clientes desde el frontend (por API ya existe, `PATCH
  /customers/:id`, falta el formulario).
- Permitir editar el precio unitario de una línea de compra desde el
  frontend (la API ya lo admite; hoy la UI siempre usa el precio actual
  del producto).

## Requisitos

- Docker y Docker Compose.
- (Para desarrollo sin Docker) Node.js 22+ y PostgreSQL 16+.

## Arrancar con Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

La primera vez que arranca el backend, aplica automáticamente la migración
inicial (`prisma migrate deploy`) usando el rol administrador de Postgres.
El backend en sí siempre se conecta con `app_role`, un rol **sin privilegio
de superusuario**, para que las políticas de Row-Level Security se apliquen
de verdad (ver `docs/ARCHITECTURE.md`).

## Probar la API

```bash
# 0. Entrar como administrador de la plataforma (credenciales de
#    PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD en tu .env)
curl -X POST http://localhost:3000/platform-admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@example.com", "password": "<tu PLATFORM_ADMIN_PASSWORD>"}'
# -> devuelve un accessToken de administrador de plataforma

# 0b. Autorizar un negocio nuevo (crea el tenant + su usuario "owner")
curl -X POST http://localhost:3000/platform-admin/tenants \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken de administrador>' \
  -d '{
    "slug": "peluqueria-marisa",
    "businessName": "Peluqueria Marisa",
    "businessType": "peluqueria",
    "ownerEmail": "marisa@example.com",
    "ownerPassword": "password123",
    "ownerFullName": "Marisa Gomez"
  }'

# 1. El owner ya puede hacer login normal (con su propio slug/email/password)
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"slug": "peluqueria-marisa", "email": "marisa@example.com", "password": "password123"}'
# -> devuelve un accessToken (JWT) de este negocio

# 2. Usar el token para crear un cliente
curl -X POST http://localhost:3000/customers \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{"fullName": "Cliente de prueba", "phone": "600111222"}'

# 3. Listar clientes (solo verás los de tu propio negocio)
curl http://localhost:3000/customers -H 'Authorization: Bearer <accessToken>'

# 4. Configurar las reglas de puntos de tu negocio (solo owner/admin)
curl -X PATCH http://localhost:3000/points-config \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"pointsPerCurrencyUnit": 2, "minPurchaseAmount": 10}'

# 5. Registrar una visita de un cliente
curl -X POST http://localhost:3000/customers/<customerId>/interactions \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"type": "visit", "notes": "Revisión anual"}'

# 5b. Registrar una llamada comercial con resultado
curl -X POST http://localhost:3000/customers/<customerId>/interactions \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"type": "call", "outcome": "call_back", "followUpAt": "2026-10-01T10:00:00Z"}'

# 6. Crear un producto (solo owner/admin)
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"name": "Ventana PVC 1x1m", "category": "Ventanas", "price": 150}'

# 7. Registrar una compra con líneas de producto (calcula el total y los puntos)
curl -X POST http://localhost:3000/customers/<customerId>/purchases \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"items": [{"productId": "<productId>", "quantity": 2}]}'

# 8. Registrar una devolución parcial de esa compra
curl -X POST http://localhost:3000/customers/<customerId>/purchases/<purchaseId>/returns \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"amount": 20, "reason": "Pieza defectuosa"}'

# 9. Ver los segmentos pre-creados (solo owner/admin)
curl http://localhost:3000/segments -H 'Authorization: Bearer <accessToken>'

# 10. Buscar clientes
curl "http://localhost:3000/customers?q=marisa" -H 'Authorization: Bearer <accessToken>'

# 11. Reportes (solo owner/admin)
curl http://localhost:3000/reports/customers -H 'Authorization: Bearer <accessToken>'
curl http://localhost:3000/reports/products -H 'Authorization: Bearer <accessToken>'
```

## Desarrollo sin Docker (backend)

```bash
cd backend
npm install
npx prisma generate

# Aplicar la migración inicial usando el rol administrador de Postgres
# (crea también el rol "app_role" que usará la aplicación)
DATABASE_URL="postgresql://postgres:<tu_password>@localhost:5432/crm" \
  npx prisma migrate deploy

# Arrancar el backend conectado como app_role (no como superusuario)
DATABASE_URL="postgresql://app_role:<password_de_app_role>@localhost:5432/crm" \
  JWT_SECRET="cualquier-secreto-largo" \
  PLATFORM_ADMIN_JWT_SECRET="otro-secreto-distinto" \
  PLATFORM_ADMIN_EMAIL="admin@example.com" \
  PLATFORM_ADMIN_PASSWORD="cambia-esto" \
  npm run start:dev
```

## Desarrollo sin Docker (frontend)

```bash
cd frontend
npm install
VITE_API_URL="http://localhost:3000" npm run dev
```

## Seguridad — resumen

- **Alta de negocios controlada**: no existe registro público; solo el
  administrador de la plataforma (una única cuenta sembrada desde
  `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` al arrancar, sin
  endpoint de auto-registro) puede autorizar un negocio nuevo.
- **Aislamiento entre negocios**: cada tabla con datos de un negocio tiene
  políticas de Row-Level Security en Postgres, no solo un `WHERE` en el
  código. Verificado con pruebas reales (ver `docs/ARCHITECTURE.md`).
- **Aislamiento de administrador de plataforma**: usa un secreto de JWT
  distinto (`PLATFORM_ADMIN_JWT_SECRET`) al de los usuarios de negocio —
  un token de un tipo nunca es válido para rutas del otro, verificado con
  pruebas reales.
- **Contraseñas**: hasheadas con bcrypt (12 rondas), nunca en texto plano.
- **Autenticación**: JWT firmado, expira a las 8 horas.
- **Roles**: cada endpoint sensible exige un rol mínimo (`owner`/`admin`).
- **Borrado de clientes**: lógico (`deleted_at`), no físico, para mantener
  trazabilidad de auditoría — pensado como base para un futuro "derecho al
  olvido" real.
- **Secretos**: nunca committeados; `.env` está en `.gitignore` y
  `.env.example` documenta las variables sin valores reales de producción.

Este es un proyecto de práctica: las contraseñas de ejemplo en
`.env.example` y en `docker-compose.yml` son válidas solo para desarrollo
local y deben cambiarse antes de cualquier uso real.
