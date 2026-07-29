# Rotisería Los Hermanos — Sistema de gestión

Sistema de gestión para una rotisería real: pedidos para retirar, con roles separados para
cliente, recepción, cocina y administración. Primer proyecto de cliente real, pensado y construido
como trabajo de producción — no como ejercicio de práctica.

## Qué resuelve

- **Cliente** (público, sin login): carta digital, carrito, checkout, seguimiento del pedido por
  número.
- **Recepción**: alta manual de pedidos (mostrador/teléfono), listado y dashboard del día.
- **Cocina**: panel de pedidos en curso, asignación/reprogramación de horarios de retiro, aviso
  sonoro y notificación push cuando entra un pedido nuevo.
- **Administración**: reportes mensuales, gestión de horarios comerciales y catálogo de productos.

## Decisiones de diseño que vale la pena mirar

- **Dos builds de frontend separados** (`cliente` / `staff`), con entradas Vite distintas
  (`vite.cliente.config.ts` / `vite.staff.config.ts`) que nunca importan código de la otra app
  transitivamente — el bundle de cliente no puede terminar incluyendo código de staff por
  accidente, verificado en cada build.
- **Numeración de pedidos por jornada comercial**: la rotisería cierra después de medianoche, así
  que el número de pedido resetea a las 7am (no a las 00:00) — `businessDayFor()` calcula a qué
  jornada comercial pertenece cada pedido, en offset fijo de Argentina, sin depender de la zona
  horaria del servidor.
- **Autenticación JWT por rol** (`recepcionista` / `cocina` / `admin`), con cada cuenta viendo
  únicamente su sección — una decisión explícita del negocio: una cuenta de administrador
  administra, no supervisa recepción/cocina desde el mismo login.
- **Notificaciones Web Push multiplataforma**: cocina puede operar desde una tablet Android con la
  pantalla apagada, un PC con Windows o una Mac con Safari — el aviso de pedido nuevo usa Web Push
  estándar (VAPID) más un beep sintetizado con Web Audio API, porque ningún navegador soporta un
  sonido personalizado dentro de una notificación del sistema operativo.
- **Backend separado** (`server/`, Express + Prisma + Postgres) solo para lo que no es seguro hacer
  desde el navegador: JWT y claves de integraciones externas (FUDO).

## Stack

React 18 + TypeScript + Vite + Tailwind v4 (frontend) · Express + TypeScript + Prisma + PostgreSQL
(backend) · Vitest + Testing Library + Supertest (tests unitarios/integración) · Playwright (e2e).

## Correr el proyecto localmente

```
npm i
npm run dev          # cliente — http://localhost:5173
npm run dev:staff    # staff  — http://localhost:5174 (necesita un usuario sembrado, ver abajo)
```

Backend (necesario para que cualquiera de las dos apps cargue pedidos/catálogo, o para loguearse
en staff):

```
cd server
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET (ej. openssl rand -hex 32)
npm i
npm run db:migrate     # crea las tablas
npm run db:generate    # regenera el Prisma Client
npm run db:seed        # da de alta el primer usuario de staff (SEED_ADMIN_* del .env)
npm run dev             # http://localhost:4000
```

Sin `db:seed` no hay ninguna cuenta para entrar a la app de staff (todavía no hay pantalla de alta
de usuarios — se agregan por env vars).

Otros comandos útiles: `npm run build` / `build:staff` (builds de producción), `npm run typecheck`,
`npm run lint:css`, `npm test` (raíz y `server/`), `npm run test:e2e` (Playwright).

## Estado

Postgres real (no datos de prueba en memoria), autenticación funcionando, cuatro roles operativos.
En desarrollo activo junto con el cliente real de la rotisería.

---

Desarrollado por [Daniel Rodríguez](https://github.com/danir28).
