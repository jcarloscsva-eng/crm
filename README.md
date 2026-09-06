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
- Autenticación (registro de negocio + login) con JWT.
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
- Frontend (React + Vite): registro de negocio, login, listado y alta de
  clientes, sesión persistida en el navegador. Probado en Chromium real
  (registro → crear cliente → refresh → logout → login → el cliente sigue
  ahí).

Pendiente (próximas iteraciones):
- Pantallas de frontend para interacciones, compras, devoluciones y
  segmentos (por ahora solo existen como API, probadas con curl).
- Exportación de datos de un cliente y purga física (RGPD más completo).

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
# 1. Registrar un negocio nuevo (crea el tenant + el usuario "owner")
curl -X POST http://localhost:3000/auth/register-tenant \
  -H 'Content-Type: application/json' \
  -d '{
    "slug": "peluqueria-marisa",
    "businessName": "Peluqueria Marisa",
    "businessType": "peluqueria",
    "ownerEmail": "marisa@example.com",
    "ownerPassword": "password123",
    "ownerFullName": "Marisa Gomez"
  }'
# -> devuelve un accessToken (JWT)

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

# 6. Registrar una compra (calcula los puntos automáticamente)
curl -X POST http://localhost:3000/customers/<customerId>/purchases \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"amount": 50}'

# 7. Registrar una devolución parcial de esa compra
curl -X POST http://localhost:3000/customers/<customerId>/purchases/<purchaseId>/returns \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"amount": 20, "reason": "Pieza defectuosa"}'

# 8. Ver los segmentos pre-creados (solo owner/admin)
curl http://localhost:3000/segments -H 'Authorization: Bearer <accessToken>'
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
  npm run start:dev
```

## Desarrollo sin Docker (frontend)

```bash
cd frontend
npm install
VITE_API_URL="http://localhost:3000" npm run dev
```

## Seguridad — resumen

- **Aislamiento entre negocios**: cada tabla con datos de un negocio tiene
  políticas de Row-Level Security en Postgres, no solo un `WHERE` en el
  código. Verificado con pruebas reales (ver `docs/ARCHITECTURE.md`).
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
