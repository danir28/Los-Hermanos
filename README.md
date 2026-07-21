# Rotisería Los Hermanos App

This is a code bundle for Rotisería Los Hermanos App. The original project is available at https://www.figma.com/design/OKcg2iq0XUofYOrkAgIlv9/Rotiser%C3%ADa-Los-Hermanos-App.

The app is split into two separate frontends that share the same `src/` tree (see `CLAUDE.md` for the full architecture):

- **Cliente** — public, no login: catalog, cart, checkout, order tracking.
- **Staff** — recepción / cocina / admin, behind a login.

## Running the code

Run `npm i` to install the dependencies (shared by both apps).

- `npm run dev` — cliente dev server, http://localhost:5173
- `npm run dev:staff` — staff dev server, http://localhost:5174 (needs a seeded user to log in — see below)
- `npm run build` / `npm run build:staff` — production builds (`dist/` / `dist-staff/`)
- `npm run typecheck` — type-checks both apps
- `npm run lint:css` — stylelint over `src/**/*.css`

The backend (below) must also be running for either app to load orders/catalog data or for staff to log in.

## Backend / integraciones (FUDO, WhatsApp)

Hay un backend separado en `server/` que maneja la autenticación del staff y las integraciones con FUDO y con el agente de WhatsApp (Twilio), respaldado por una base PostgreSQL.

### Base de datos (una sola vez)

Necesitás Postgres corriendo localmente y un rol/base dedicados para la
app (no uses el superusuario `postgres` directo). Con pgAdmin (o `psql`),
conectado como `postgres`, corré estas dos sentencias **una por vez**
(`CREATE DATABASE` no puede ir junto con otra sentencia):

```sql
CREATE ROLE los_hermanos_app WITH LOGIN PASSWORD 'ELEGI_UNA_CONTRASEÑA';
```
```sql
CREATE DATABASE los_hermanos OWNER los_hermanos_app;
```
```sql
ALTER ROLE los_hermanos_app CREATEDB;
```

(El último permiso lo necesita Prisma Migrate para crear una base
temporal de comparación al generar migraciones.)

### Levantar el backend

```
cd server
cp .env.example .env
# completar DATABASE_URL con la contraseña elegida arriba, JWT_SECRET (ej. con
# `openssl rand -hex 32`) y las credenciales de FUDO/WhatsApp cuando estén disponibles
npm i
npm run db:migrate    # crea las tablas
npm run db:generate   # regenera el Prisma Client — no asumir que db:migrate ya lo hizo
npm run db:seed       # da de alta el primer usuario de staff, con SEED_ADMIN_* del .env
npm run dev
```

Sin el paso de `db:seed` no hay ninguna cuenta para loguearse en la app de staff (no hay pantalla de alta de usuarios todavía). Volver a correr `db:seed` con otros valores de `SEED_ADMIN_*` para dar de alta más cuentas (recepcionista, cocina, otro admin).

Con el backend corriendo en `http://localhost:4000`, el cliente en
`http://localhost:5173` y el staff en `http://localhost:5174`, la pestaña
**Administración → Integraciones** muestra el estado de cada conexión (FUDO/WhatsApp).
