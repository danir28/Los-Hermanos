# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rotisería Los Hermanos App — a restaurant ordering/management app, originally generated from a Figma design (via Figma Make). React 18 + TypeScript + Vite + Tailwind v4, using shadcn/Radix UI components, plus a small Express/TypeScript backend in `server/` for external integrations. All copy/UI text is in Spanish (es-AR).

## Commands

Frontend (repo root) — **two separate Vite apps since Sprint 1 Part B** (see Architecture below):
- `npm i` — install dependencies (shared by both apps, same `node_modules`)
- `npm run dev` — cliente (public, no login) dev server, http://localhost:5173
- `npm run dev:staff` — staff (recepción/cocina/admin, behind login) dev server, http://localhost:5174
- `npm run build` / `npm run build:staff` — production builds, to `dist/` and `dist-staff/` respectively
- `npm run typecheck` — `tsc --noEmit` (one command, covers both apps — they still share `tsconfig.json` and most of `src/`)
- `npm run lint:css` — stylelint over `src/**/*.css`
- `npm test` / `npm run test:watch` — Vitest + Testing Library, component/unit tests (`src/**/*.test.{ts,tsx}`, `jsdom` environment, config in `vitest.config.ts`)
- `npm run test:e2e` — Playwright end-to-end tests (`playwright.config.ts`, `tests/e2e/`)

Backend (`server/`):
- `npm i` (inside `server/`) — install backend dependencies
- `npm run dev` — start the API with hot reload (http://localhost:4000)
- `npm run build` / `npm run start` — compile to `dist/` and run it
- `npm run typecheck` — `tsc --noEmit`
- `npm test` / `npm run test:watch` — Vitest + Supertest, run against a **separate** test database (`los_hermanos_test`, credentials in `server/.env.test`, never the dev DB) — see `server/vitest.config.ts` (`fileParallelism: false`: several files truncate shared tables in `afterEach`, so test files can't run concurrently)
- `npm run db:migrate` — create/apply a Prisma migration from `prisma/schema.prisma` (needs `DATABASE_URL` in `server/.env`)
- `npm run db:generate` — regenerate the Prisma Client into `src/generated/prisma`. Run this explicitly after every `db:migrate` — in practice it does **not** reliably auto-run (see ERRORS below), so don't assume the Client is in sync just because the migration applied.
- `npm run db:studio` — open Prisma Studio (GUI to browse/edit the DB)
- `npm run db:seed` — idempotent upsert of one staff user from `SEED_ADMIN_{NOMBRE,USUARIO,EMAIL,PASSWORD,ROL}` env vars (no CRUD screen yet — this is the only way to create staff accounts)

There **is** a test suite in both frontend and backend now (Vitest everywhere, Testing Library for frontend components, Supertest for backend routes, Playwright for e2e) — this used to not be the case (an earlier version of this file said so; don't trust that claim if you see it quoted anywhere) and is easy to forget since none of it runs automatically on save. Still no JS/TS linter configured in any package — `typecheck`, `lint:css`, and the test commands above are the available checks. **Three dev servers now need to run simultaneously** (in separate terminals) for a full local setup: backend (`server/`, port 4000), cliente (port 5173), staff (port 5174) — plus Postgres running for the backend to start correctly.

## Architecture

**Two separate frontend apps share one `src/` tree, split by who's allowed to see what (Sprint 1 Part B):**
- **Cliente** (`src/app/AppCliente.tsx`, entry `index.html` → `src/main.cliente.tsx`, built by `vite.cliente.config.ts`): public, no login, no staff code. Owns `customerView`/`cart`/`confirmedOrder` state and the cart/checkout mutation functions.
- **Staff** (`src/app/AppStaff.tsx`, entry `index.staff.html` → `src/main.staff.tsx`, built by `vite.staff.config.ts`): recepción/cocina/admin, always behind `AuthProvider`/`LoginScreen` (`src/app/auth/`). Owns `activeSection`/`staffView`/`orders` state and the order-mutation functions (these now require a token).

**The split is structural, not just organizational**: each entry file only imports its own app component transitively, so it's not possible for the cliente bundle to accidentally pull in staff code (or vice versa) — verified after every build by grepping `dist/`/`dist-staff/` for strings unique to the other app (e.g. `"Ingreso de personal"` must be in `dist-staff` only). `vite.shared.ts` holds the config both builds have in common (the `figma-asset-resolver` plugin, the `@` alias, `assetsInclude`) so it isn't duplicated. **Gotcha:** Vite's dev server always serves `index.html` at `/` regardless of `build.rollupOptions.input` (that setting is build-only) — `vite.staff.config.ts` works around this with a `configureServer` middleware that rewrites `/` → `/index.staff.html` in dev, so `npm run dev:staff` shows the staff app at its own root instead of the cliente app.

Screens still live one folder per role/persona under `src/app/`, and both apps import from the same set of folders:

- `src/app/cliente/` — `CustomerHome`, `CustomerMenu`, `CustomerCart`, `CustomerConfirmation`, `CustomerTracking`, plus `statusMessages.ts` (customer-facing copy per `OrderStatus`). Barrel export in `index.ts`. Only `AppCliente` imports this folder.
- `src/app/auth/` (Sprint 1 Part B, staff-only) — `AuthContext.tsx` (`AuthProvider`/`useAuth()`: token in `localStorage`, validated against `GET /api/auth/me` on mount, `login()`/`logout()`), `LoginScreen.tsx`. Barrel export in `index.ts`. Only `AppStaff` imports this folder.
- `src/app/recepcionista/` — `ReceptionistDashboard`, `ReceptionistOrders`, `ReceptionistCreateOrder`. Barrel export in `index.ts`.
- `src/app/cocina/` — `KitchenPanel`, `KitchenAssign`, `KitchenSlotWindows` (barrel-exported in `index.ts`), plus small helpers imported directly (not through the barrel): `AgeIndicator.tsx` (urgency pill), `reprogReasons.ts`, `timeAgo.ts`, `NotificationSetup.tsx` (added 29/7/2026 — "activate push notifications" banner rendered inside `KitchenPanel`, see "Aviso push a cocina" under Backend). `KitchenKanban`/`kanbanConfig.ts`, which this line used to list, are gone — pickup times/status now advance automatically by clock, see `advanceScheduledOrders`; don't go looking for a manual kanban board.
- `src/app/admin/` — `AdminDashboard`, `AdminReports`, `AdminIntegrations` (+ `IntegrationBadge.tsx`). `AdminReports`/`AdminIntegrations` read the token via `useAuth()` since their backend routes are admin-only. Barrel export in `index.ts`.
- `src/app/components/shared/` — `StatusBadge`, `TypePill`, `RoleNavTabs`, used across roles. Barrel export in `index.ts`.
- `src/app/data/` — `products.ts` (`PRODUCTS`, `CATEGORIES`), `sampleOrders.ts` (`SAMPLE_ORDERS`, no longer used to seed `orders` state — real orders come from the backend), `statusConfig.ts` (`STATUS` map: color/icon/label per `OrderStatus`).
- `src/app/types.ts` — shared domain types: `Product`, `Order`, `CartItem`, `OrderStatus`, `OrderType`, `StatusCfg`.
- `src/app/lib/` — `format.ts` (`formatCurrency`), `api.ts` (backend fetch wrapper — `authLogin`/`authMe`/`authLogout`/`ordersLookup` are public; `ordersList`/`ordersUpdate`/`reportsMonthly`/`fudoStatus`/`fudoSync`/`pushSubscribe`/`pushUnsubscribe` all take a `token` as their first, explicit argument rather than reading it from hidden module state — keeps `api.ts` shared safely between the two apps without one leaking session state into the other), `push.ts` (added 29/7/2026, staff-only in practice even though nothing stops the cliente bundle from importing it — wraps the browser's Push API: `subscribeToKitchenPush()`/`unsubscribeFromKitchenPush()`/`getExistingSubscription()`, see "Aviso push a cocina" under Backend), `sound.ts` (added 29/7/2026 — `unlockAudio()`/`playNewOrderBeep()`, synthesizes the "pedido nuevo" beep with Web Audio API, see "Beep sonoro" under "Aviso push a cocina").

When making changes, go straight to the relevant role folder rather than searching `AppCliente`/`AppStaff` — neither contains section banners; each screen is its own file.

There is no router (react-router is a dependency but unused here). Navigation is plain `useState` + conditional rendering:
- `AppCliente`: `customerView` drives the customer sub-views (`home`, `menu`, `cart`, `confirmation`, `tracking`)
- `AppStaff`: the section (recepción/cocina/admin) is not its own state — it's always exactly `user.rol`, with no UI to switch between sections, for any role including admin (explicit product decision: an admin account only administers, it doesn't also supervise recepción/cocina from the same login). `staffView` drives the sub-views within that fixed section (dashboard/orders/create, panel/assign/kanban, dashboard/reportes/integraciones); `SECTION_LABEL` just picks the header icon/label for the logged-in role.
- Section components receive state and setters as props from the app component (e.g. `cart`, `orders`, `onNavigate`) rather than reading from context — no global store, except for auth (`useAuth()`, staff-only)

Catalog data (`Product`) and `Order`/`OrderItem` are both real, backed by Postgres via `src/app/lib/api.ts` (`src/app/data/products.ts` no longer holds the live catalog — see `server/src/products/`). Order status transitions (`Programado → En preparación → Listo para retirar → Entregado`, or `Cancelado`) are modeled via the `OrderStatus` union — every order is created with a chosen pickup slot, so it always starts at `Programado`; there is no longer a `Pendiente` "no slot yet" state (removed 26/7/2026, see ERRORS/history — the fallback had become unreachable once the UI started requiring a slot before letting checkout/manual-order confirm).

Other files:
- `src/main.cliente.tsx` / `src/main.staff.tsx` — entry points, mount `<AppCliente />` / `<AppStaff />` respectively
- `src/app/components/ui/*` — shadcn/Radix primitives (button, dialog, card, etc.); mostly unused by the app currently but available for use
- `src/app/components/figma/ImageWithFallback.tsx` — image component from the original Figma export
- `src/styles/theme.css` — CSS custom properties for the design system (colors, radius, chart colors); `:root` is the light theme, `.dark` variants exist for dark mode
- `src/styles/index.css` — imports fonts, tailwind, theme in that order

## Backend (`server/`)

Separate Express + TypeScript app, not part of the Vite build, run independently (`server/package.json`, own `tsconfig.json`). It exists because integrating FUDO requires holding an API key, plus JWT auth and Web Push both need a secret-holding server — neither is safe to do from the browser. Config/secrets live in `server/.env` (see `server/.env.example`), never in frontend code.

- `src/config.ts` — reads env vars, exposes `isFudoConfigured()`; also builds `config.jwt.{secret,expiresIn}` and throws at startup if `JWT_SECRET` is unset, and splits `CORS_ORIGIN` into a `string[]` (one entry per allowed origin — the two Netlify sites)
- `src/db.ts` — exports the singleton `db` (Prisma Client), constructed with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter — there's no built-in query engine binary anymore; the connection string comes from `DATABASE_URL`)
- `src/auth/` — real authentication (Sprint 1), same `{routes,service,middleware,types}.ts` shape as the rest of the backend. `service.ts` (`login()` bcrypt-compares and signs an HS256 JWT `{ sub, usuario, rol }`, `getUserById()` re-reads from the DB for `/me`), `middleware.ts` (`requireAuth` fills `req.user` straight from the JWT — no DB hit per request, so a deactivated user keeps access until their token expires naturally; `requireRole(...roles)` for 403s), `routes.ts` (`POST /login`, `GET /me` protected, `POST /logout` — client-side-only, no revoked-token table). `src/types/express.d.ts` augments `Request.user: AuthUser`.
- `src/lib/asyncHandler.ts` — wraps an async Express handler so a rejected promise reaches `next(err)` instead of hanging the request; paired with the global error-handling middleware at the end of `index.ts`. Applied to `orders` POST/GET/`lookup` and to `auth` routes so far — not yet to `fudo` (known gap, see Domain model section).
- `src/integrations/fudo/` — `types.ts` (provisional shape, no FUDO API docs yet), `client.ts` (`fetchFudoProducts()`, throws `FudoNotConfiguredError` when unset), `routes.ts` (`GET /status`, `POST /sync` upserts into the `FudoProduct` table, `GET /products`) — whole router requires `requireAuth` + role `admin`
- `src/push/` (added 29/7/2026) — Web Push notifications, not a third-party integration like fudo above (no external account to configure beyond a self-generated VAPID key pair). `client.ts` wraps the `web-push` package (`sendPushNotification()`, throws `PushNotConfiguredError` if `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are unset, `PushSubscriptionExpiredError` when the provider confirms a subscription is dead via 404/410). `service.ts` (`saveSubscription()`/`deleteSubscription()` — upsert/delete by `endpoint`, the row's unique key; `notifyRole(role, payload)` — fans out to every `PushSubscription` belonging to that role, **never throws**, logs and skips a subscription that fails to send, deletes one the provider says is expired; `notifyKitchenNewOrder(order)` — the one this feature actually calls). `routes.ts` (`POST /subscribe`, `POST /unsubscribe`, both `requireAuth` + role `cocina` — the only role that uses this today, see "Aviso push a cocina" below).
- `src/app.ts` — the Express app itself (no side effects: no `.listen()`, no `setInterval`, no signal handlers), so it can be imported directly by Supertest in `tests/routes/*.test.ts` without binding a real port. Mounts `/api/auth`, `/api/fudo`, `/api/orders`, `/api/products`, `/api/push`, `/api/reports`, `/api/slot-windows`, `/api/business-hours`, plus `GET /api/health`; global error-handling middleware at the end catches whatever `asyncHandler` forwards. This file didn't exist when most of the rest of this doc was written — it was split out of `index.ts` once the backend got a real test suite (see "There **is** a test suite..." note under Commands above); if you see an older reference to `index.ts` mounting routers, it's stale.
- `src/index.ts` — the real process entrypoint: imports `app` from `app.ts`, calls `.listen()`, starts the periodic `setInterval` that runs `advanceScheduledOrders` (see `orders/service.ts`), and disconnects Prisma on `SIGINT`/`SIGTERM`

FUDO is **scaffolded but not connected to a real account** — no API docs yet. Endpoints return a clear 400 error ("no configurado") instead of calling out, so the rest of the system stays usable without credentials. When wiring in the real one: update `server/.env`, and adjust the field mapping in `fudo/client.ts`'s `mapProduct()` once the real response shape is known.

There is no `AdminIntegrations` component anymore — it (and the whole WhatsApp-agent integration it partly surfaced) was removed 29/7/2026, see "WhatsApp: eliminado" below. Whatever FUDO-status UI is needed later would have to be rebuilt from scratch, not restored from git history as-is (it was dual-purpose and the WhatsApp half no longer applies).

### Database (Postgres + Prisma)

Local Postgres 18 (installed via the EDB macOS installer, `/Library/PostgreSQL/18`), accessed through a dedicated `los_hermanos_app` role/database — never through the `postgres` superuser. Schema lives in `server/prisma/schema.prisma`; migrations in `server/prisma/migrations/` (committed to git, generated code in `server/src/generated/prisma` is not).

Prisma 7 config split: `server/prisma.config.ts` holds `DATABASE_URL` for the CLI (`migrate`/`studio`), while `PrismaClient` at runtime needs an explicit `adapter` (see `src/db.ts`) — this is new in Prisma 7 and easy to get wrong if copying older Prisma examples from memory.

Current tables (ya no solo integraciones + auth — el catálogo de productos también vive acá desde el 1/8/2026, ver la sección de abajo; la afirmación de más adelante en este archivo bajo "Domain model — not yet built" de que products/categories no están en la DB quedó vieja, no confiar en ella):
- `FudoProduct` (`fudo_products`) — latest known FUDO catalog snapshot, upserted by `externalId` on every sync, no history kept
- `Product` (`products`) / `ProductImage` (`product_images`) / `ProductOptionGroup` (`product_option_groups`) / `ProductOption` (`product_options`) — catálogo real del local, ver "Catálogo de productos" más abajo para el detalle
- `Order` (`orders`) / `OrderItem` (`order_items`) — real order data (Sprint before this one). **`id` (uuid) is the real identifier** — it's what `updateOrder()`/`PATCH /api/orders/:id` use, and the only thing safe to use to target one specific order. **`orderNumber` is just the display code** ("007") and resets every business day (see `OrderCounter` below) — it is **not** globally unique anymore (branch `recepcionista`), so never use it alone to identify a specific order; it's fine for showing to a human or for `GET /api/orders/lookup`. `deliveredAt` is set by `updateOrder()` only when `status` transitions to `"Entregado"` — it's the moment of delivery, not of creation, and is what `ReceptionistDashboard`'s "Entregados hoy" card filters on (`status === "Entregado"` alone isn't "today", it's "ever delivered" — that was the original bug this fixed). Orders delivered before this column existed have `deliveredAt: null` and correctly don't count as "today". `AdminDashboard`'s "Pedidos hoy"/"Facturado hoy"/"Cancelados hoy" had the exact same class of bug (no date filter at all) — fixed on the `administrador` branch: `GET /api/orders` now restricts to the current business day for the `admin` role too (same `onlyCurrentBusinessDay` mechanism as `recepcionista`, see `ROLES_LIMITED_TO_TODAY` in `orders/routes.ts`), so `AdminDashboard`'s `orders` prop arrives pre-filtered. `AdminReports` is unaffected — it queries `GET /api/reports/monthly` independently, which still works over full history.
- `OrderCounter` (`order_counters`, branch `recepcionista`) — one row per business day (`businessDate`, the primary key), holding `lastNumber`. `createOrder()` does an atomic `upsert` with `{ increment: 1 }` to hand out the next `orderNumber` for the current business day without a race condition between two orders created near-simultaneously (Postgres compiles this to a single `INSERT ... ON CONFLICT DO UPDATE`, atomic by construction — no app-level locking needed).
- `User` (`users`, Sprint 1) — staff accounts (`recepcionista`/`cocina`/`admin`, validated in TS via `auth/types.ts`'s `USER_ROLES`, not as a DB enum — same convention as `Order.status`/`Order.type`). No CRUD screen yet: accounts are only created via `server/prisma/seed.ts` (`npm run db:seed --prefix server`, reads `SEED_ADMIN_{NOMBRE,USUARIO,EMAIL,PASSWORD,ROL}` from `server/.env`, idempotent upsert by `usuario`)
- `PushSubscription` (`push_subscriptions`, added 29/7/2026) — one row per device/browser subscribed to Web Push notifications, `endpoint` unique (upsert on it, see `push/service.ts#saveSubscription`), `onDelete: Cascade` from `User`. See "Aviso push a cocina" below.

### Catálogo de productos: `Product`/`ProductOptionGroup`/`ProductOption`/`ProductImage` (added 1/8/2026, opciones vinculadas a categoría 6/8/2026)

`Product` (`products`) reemplaza el array hardcodeado que vivía en `src/app/data/products.ts` (ver `server/src/products/`) — `id` queda `Int` autoincrement a propósito (no `uuid`), para no forzar un cambio de tipo en cascada por todo el frontend, que ya maneja `Product.id`/`CartItem.id` como `number`. `category` es texto libre (misma convención que `Order.status`/`Order.type`), no hay una entidad `Category` separada. `ProductImage` (`product_images`) es el carrusel de fotos (`sortOrder` define el orden, la primera es la miniatura), subidas por multipart a `server/uploads/products/` (gitignored) y servidas por `express.static("/uploads")`.

`ProductOptionGroup` (`product_option_groups`) / `ProductOption` (`product_options`) son variantes configurables de un producto (sabor, agregados, reparto de cantidad) — se editan en `AdminProducts.tsx`, sección "Opciones del producto" (reemplazo completo del set en cada guardado, `PUT /api/products/:id/option-groups`) y se resuelven en cliente/recepción con `ProductOptionsModal` antes de agregar el producto al carrito. `selectionType`: `"single"` (radio, una opción), `"multiple"` (checkboxes, 0 o más) o `"quantity"` (reparto de N unidades entre opciones, la suma tiene que dar exacto `quantityTarget` — ej. 12 empanadas repartidas entre sabores).

**Grupos vinculados a categoría (added 6/8/2026):** dos campos nuevos, `ProductOptionGroup.sourceCategory: string | null` y `Product.offerAsOption: boolean`. Si un grupo tiene `sourceCategory` seteado (ej. `"Empanadas"`), sus opciones dejan de salir de las filas `ProductOption` guardadas y se calculan en el momento (`resolveGroupOptions` en `products/service.ts`) a partir de `Product` filtrado por esa `category`, `active: true`, `outOfStock: false` y `offerAsOption: true` — `priceDelta` de una opción dinámica es siempre `0`. Pensado para "Empanadas (docena)"/"(media docena)" y "Mitad pizza": antes cada sabor estaba tipeado a mano y duplicado en 2-3 productos contenedor, sin relación con la tabla `Product`, así que agregar un sabor nuevo o sacarle el stock a uno existente no se reflejaba en ningún lado sin editar esos contenedores a mano. Ahora alcanza con crear el sabor como producto individual (tildando `offerAsOption`) para que aparezca solo en todos los grupos vinculados a su categoría, y sacarle el stock lo saca de esos grupos sin tocar el contenedor. Un grupo dinámico no persiste `options` — el `PUT` lo rechaza si vienen no vacías (ver `parseOptionGroups` en `products/routes.ts`), porque no tiene sentido guardar algo que nunca se va a leer. Un grupo manual (`sourceCategory: null`, ej. "Agregados → Papas fritas" del sandwich de milanesa) sigue funcionando exactamente igual que antes. `AdminProducts.tsx` expone el modo dinámico como un selector "Origen de las opciones" por grupo (Manual / Vinculado a categoría X), con preview en vivo de qué productos van a aparecer.

### Numeración de pedidos por jornada comercial (branch `recepcionista`)

The rotisería is open past midnight (until ~2am) but the order number resets at **7:00 AM** — so a "business day" is a 7am-to-7am window, not a calendar day. `server/src/orders/businessDay.ts`'s `businessDayFor(date)` computes which business day an instant belongs to, working in a fixed Argentina UTC-3 offset explicitly (not the server OS's timezone) so this stays correct regardless of what timezone the eventual VPS is configured with. An order placed at 1am on the 19th still belongs to the business day of the 18th.

`Order.orderNumber` is no longer `@unique`/`@default(autoincrement())` — it's unique only per `businessDate` (`@@unique([businessDate, orderNumber])`), reset by `OrderCounter` above. This is why `Order.id` (uuid) had to become the thing every mutation (`updateOrder`, and the frontend's `onUpdateStatus`/`onAssigned`/`onGoAssign`) references, and `orderNumber` become purely a display field — see the split explained in the `Order`/`OrderDTO` types.

`GET /api/orders/lookup?orderNumber=` (public, used by the customer's tracking screen) resolves against `{ businessDate, orderNumber }` (the actual `@@unique` on `Order`), using `businessDayFor(new Date())` for `businessDate` — the same helper `createOrder`/`listOrders`'s recepcionista filter use, so the 7am-boundary edge case (a search made after midnight but before 7am still resolves against the previous business day) is handled the same way everywhere. A search for an order number that only exists on a past business day correctly returns not-found instead of resolving to that older order — fixed on the `cliente` branch (previously a known interim gap here: it used to `findFirst` ordered by `businessDate desc`, so an old number could resolve to a different old order with the same number from a different day).

`npx prisma migrate dev` requires the app role to have `CREATEDB` (Postgres needs it to spin up a throwaway shadow database for diffing) — this was granted once manually via `ALTER ROLE los_hermanos_app CREATEDB;`, run as the `postgres` superuser through pgAdmin. Two of this project's migrations (`add_order_number_reset_step1`/`step2`, splitting a NOT NULL column addition into nullable-then-backfill-then-required) were written and applied by hand instead of via the interactive `prisma migrate dev` wizard, because the working environment here has no TTY — see the workflow note in ERRORS below if this comes up again.

### Aviso push a cocina cuando entra un pedido (added 29/7/2026)

Cocina va a operar desde una tablet Android fija que puede quedar con la pantalla apagada, así que el polling de 10s que ya trae `AppStaff.tsx` (`refreshOrders`/`setInterval`, ver más abajo) no alcanza — un `setInterval` en una pestaña en background no corre de forma confiable en un navegador móvil con la pantalla apagada. La solución es una notificación **Web Push** real (sistema operativo, no solo la pestaña), que sí puede despertar el dispositivo.

Se dispara desde `orders/routes.ts`'s `POST /` (`ordersRouter.post("/", ...)`), justo después de que `createOrder()` devuelve el pedido creado, con un `.catch()` sin `await` bloqueante — cubre los dos orígenes de pedido (checkout del cliente y alta manual de recepción/cocina) porque ambos pasan por ese mismo endpoint, sin necesidad de duplicar el disparo. `orders/service.ts` (la capa de dominio pura) no sabe nada de `push/` a propósito — ver `push/service.ts#notifyKitchenNewOrder` para el armado del mensaje.

Solo el rol `cocina` puede suscribirse (`requireRole("cocina")` en `push/routes.ts`), mismo criterio de scoping por rol que `fudo` usa con `admin`. Del lado del frontend: `public-staff/sw-push.js` (Service Worker, JS plano, `publicDir` de la app staff — no lo sirve la app cliente), `src/app/lib/push.ts` (`subscribeToKitchenPush()`/`unsubscribeFromKitchenPush()`/`getExistingSubscription()`, wrapea la Push API del navegador), `src/app/cocina/NotificationSetup.tsx` (botón "Activar notificaciones", renderizado dentro de `KitchenPanel`, que ahora recibe `token` como prop nuevo para poder llamarlo).

VAPID: un solo par de claves para todo el proyecto (no una por entorno), generado con `npx web-push generate-vapid-keys`. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` en `server/.env`; la pública además tiene que copiarse tal cual a `VITE_VAPID_PUBLIC_KEY` en el `.env` de la raíz — no es secreta, el navegador la necesita para suscribirse.

**No probado con pantalla apagada de verdad todavía** — eso solo se puede validar en la tablet física, en producción, sobre HTTPS (Web Push exige contexto seguro para `serviceWorker.register()`, salvo `localhost`). El flujo completo (suscripción → fila en `push_subscriptions` → disparo al crear pedido → notificación del sistema) sí está probado en Chrome de escritorio en desarrollo, que soporta Web Push igual.

#### Beep sonoro (added 29/7/2026)

Pedido de Daniel: que además de la notificación visual suene un beep, en Windows, en Mac/Safari y en la tablet Android/Chrome. Dato clave que determina todo el diseño: **ningún navegador soporta un sonido propio dentro de la notificación del sistema operativo** — el campo `sound` de la Notification API se sacó de la spec hace años y `showNotification()` nunca tuvo (en ningún navegador) forma de indicar un archivo de audio. Por eso el beep no es parte de la notificación push en sí — se sintetiza con Web Audio API desde la pestaña, en `src/app/lib/sound.ts` (`unlockAudio()`/`playNewOrderBeep()`, dos tonos cortos generados con `OscillatorNode`, sin ningún archivo de audio de por medio).

Dos disparadores, cubriendo el mismo aviso por dos caminos distintos (el segundo es red de contención del primero, no algo redundante a propósito):
- **Push instantáneo**: `public-staff/sw-push.js` ahora, además de `showNotification()`, le manda un `postMessage({ type: "nuevo-pedido-push" })` a todas las pestañas abiertas (`self.clients.matchAll`) — `AppStaff.tsx` escucha ese mensaje (`navigator.serviceWorker.addEventListener("message", ...)`, solo si `user.rol === "cocina"`) y suena al toque, si la pestaña está en primer plano. Desde 30/7/2026 este handler también llama a `refreshOrders()` (antes solo sonaba el beep y el pedido nuevo tardaba hasta el próximo ciclo del polling en aparecer en el Panel) — así el pedido queda visible en pantalla en el mismo instante que suena.
- **Polling de 10s** (bajado de 30s el 30/7/2026, para que la espera máxima en el peor caso — push no recibido — sea más corta): `refreshOrders()` en `AppStaff.tsx` compara los ids de pedidos contra `knownOrderIds` (un `useRef<Set<string>>`) y suena si aparece uno nuevo — cubre el caso de que el push no haya llegado (permiso no otorgado, sin conexión al momento del push). El debounce de 4s dentro de `playNewOrderBeep()` evita que un mismo pedido suene dos veces si le llega por ambos caminos casi al mismo tiempo.

`unlockAudio()` se llama una sola vez, en el primer `pointerdown` sobre la app (`AppStaff.tsx`) — los navegadores no dejan arrancar un `AudioContext` sin un gesto previo del usuario (política de autoplay, más estricta en Safari); no hace falta que ese gesto tenga que ver con sonido, cualquier interacción real alcanza para desbloquearlo.

Alcance: solo Windows/Mac/Android con Chrome/Firefox/Edge/Safari de escritorio o tablet — **no cubre iPhone/iPad**. iOS/iPadOS Safari no expone `PushManager` a menos que el sitio esté instalado a la pantalla de inicio (PWA en modo standalone), y la app de staff todavía no tiene manifest ni íconos para eso — quedó explícitamente fuera de esta vuelta (evaluado y descartado por ahora, no un olvido).

### WhatsApp: eliminado (29/7/2026)

El cliente confirmó que no va a atender pedidos por WhatsApp con un bot ni con este sistema: van a usar WhatsApp Business con un mensaje automático nativo que deriva al cliente a la web (ver [[project_whatsapp_bot_not_needed]]). Como ya no hay ningún caso de uso real para este proyecto puntual, se sacó por completo (no se dejó scaffolded como FUDO):

- Backend: toda la carpeta `server/src/integrations/whatsapp/` (routes/client/types), el bloque `whatsapp` de `config.ts`/`isWhatsappConfigured()`, el montaje `/api/whatsapp` en `app.ts`, las variables `WHATSAPP_*` de `.env`/`.env.example`, y los modelos `WhatsappInboundEvent`/`WhatsappOutboundMessage` (migración `drop_whatsapp_tables`).
- Frontend: `AdminIntegrations.tsx` e `IntegrationBadge.tsx` completos (el primero mostraba FUDO **y** WhatsApp juntos; al sacar WhatsApp no quedaba nada reutilizable del componente, y de todos modos ya estaba fuera de `ADMIN_TABS` — no llegaba a mostrarse), y `whatsappStatus`/`whatsappNotify` de `api.ts`.

El bot de WhatsApp con AgentKit sigue existiendo como servicio de la agencia de Daniel (ver su CLAUDE.md global) — separado de este proyecto, no se descarta en general, simplemente este cliente puntual no lo necesita. `OrderType` mantiene el valor `"whatsapp"` (ver `src/app/types.ts`/`TypePill.tsx`) — es una etiqueta manual de "por dónde entró el pedido" para recepción/cocina, sin relación con la integración eliminada.

### Domain model — historia del catálogo (parte de esta sección quedó vieja, ver nota)

**Nota (6/8/2026):** el párrafo de abajo describe el estado previo a la migración del catálogo a la base — `Product`/`ProductOptionGroup`/`ProductOption`/`ProductImage` ya son tablas reales desde el 1/8/2026 (ver "Catálogo de productos" bajo Database, más arriba), así que la frase "still hardcoded, not backed by the database" ya **no** es cierta. Se deja el resto tal cual por el valor histórico (de dónde salieron los datos reales del menú, qué quedó afuera y por qué) — no se reescribe para no perder ese registro.

`server/` currently only has tables for the FUDO integration, plus `Order`/`OrderItem`/`User` (see above). Product/category catalog data is **still hardcoded in `src/app/data/products.ts`** and not backed by the database yet — that's a deliberately separate, larger piece of work (new Prisma models + CRUD endpoints + migrating that data off a hardcoded array).

As of 2026-07-21, `PRODUCTS`/`CATEGORIES` in `src/app/data/products.ts` hold the **real** menu (61 products across 13 categories: Tablas calientes, Pizzas, Hamburguesas, Empanadas, Sandwiches de milanesa, Milanesa al plato, Pastas, Comidas frías, Guarniciones, Gaseosas, Cervezas, Vinos, Aperitivos), transcribed from photos of the physical carta (2026-07-18) — no longer the placeholder Figma sample data (Pollo/Ensaladas/Guarniciones/Especiales). Still hardcoded, still not DB-backed, and prices still trace back to the physical carta rather than FUDO (see the caution about hand-patched carta prices in `[[project_client_meeting_status]]` memory) — but this is real business data now, not a stand-in. Five items from the carta (Lengua a la vinagreta, Huevos rellenos, Vitel Toné, Fritas para 2, Tortitas) were intentionally left out because no price was legible in the photos; add them once confirmed. `image` on every product is still a generic Unsplash stock photo per category, not a real photo of that dish — swap those out whenever real product photography exists, independently of the DB migration. `CustomerHome.tsx`'s four "quick category" tiles were updated 29/7/2026 to match real categories (Tablas calientes/Pizzas/Milanesa al plato/Empanadas, Daniel's product decision) and now actually filter: tapping one calls `onNavigate("menu", category)`, threaded through `AppCliente.tsx`'s `goToView()` (sets `menuCategory` state, reset to `"Todos"` on any other navigation to `"menu"` so it doesn't stick from a previous tile click) down to `CustomerMenu`'s `initialCategory` prop. Still a hardcoded list, not derived from `CATEGORIES` — if the featured 4 change again, edit the array in `CustomerHome.tsx` directly, and keep each `category` value spelled exactly as in `CATEGORIES` (`src/app/data/products.ts`) or the filter silently won't match anything.

The client also provided a requirements document (cart-based ordering, order lifecycle status tracking, receptionist/kitchen/admin roles, WhatsApp order intake) that should inform the DB schema when this catalog is finally migrated off the hardcoded array.

**Auth status (Sprint 1): done, both halves.** Backend — `User` table with bcrypt-hashed passwords (RNF-01), JWT login (`server/src/auth/`), every staff-only route requires a valid token + role. Frontend (Part B) — the app is split into `AppCliente`/`AppStaff`, `AppStaff` sits behind `AuthProvider`/`LoginScreen` (`src/app/auth/`), and every staff API call now sends `Authorization: Bearer <token>`. Still no CRUD screen for managing users — only the `db:seed` script (Sprint 2).

## Build/tooling notes

- Two Vite configs, `vite.cliente.config.ts` and `vite.staff.config.ts` (root), share common bits (the `figma-asset-resolver` plugin, `@` alias, `assetsInclude`) via `vite.shared.ts` — see Architecture above for why they're split. `tsconfig.node.json` needs both listed in its `include` for the config files themselves to typecheck (plain `path`/`__dirname` node types).
- `figma-asset-resolver` (in `vite.shared.ts`) resolves `figma:asset/*` imports to `src/assets/*` — needed for images carried over from the Figma export. Don't remove it even if currently unused.
- The React and Tailwind Vite plugins must stay even if Tailwind classes appear unused in a given moment — this is required for the Figma Make pipeline.
- Path alias `@/*` → `./src/*` (configured in `tsconfig.json` and in `vite.shared.ts`, shared by both Vite configs).
- Only `.svg` and `.csv` are configured for raw asset imports — never add `.css`, `.tsx`, or `.ts` to `assetsInclude`.
- Styling is Tailwind v4 (CSS-based config, no `tailwind.config.js`) plus CSS variables from `theme.css` for theme tokens (`bg-primary`, `text-muted-foreground`, etc. map to those variables).

## Estándares de código

Cada vez que se pida escribir, modificar o refactorizar código en este proyecto (frontend o backend), seguir siempre estos tres pasos:

1. **Acomodar**: ubicar el código nuevo o modificado en el lugar que corresponde — la carpeta de rol/persona correspondiente dentro de `src/app/` (`cliente/`, `recepcionista/`, `cocina/`, `admin/`, `auth/`), `AppCliente.tsx`/`AppStaff.tsx` según a qué app pertenezca, o el archivo correspondiente dentro de `server/src/`, sin mezclar responsabilidades entre capas (UI, lógica de negocio, acceso a datos/integraciones).
2. **Verificar**: antes de dar la tarea por terminada, correr `npm run typecheck` (frontend y/o `server/`, según lo que se haya tocado) y `npm run lint:css` si se modificaron estilos. No hay test suite todavía, así que estos checks son la única red de seguridad automática — no omitirlos.
3. **Principios de diseño**: tener siempre presentes los principios SOLID, los patrones de diseño y las buenas prácticas de diseño de software al escribir o refactorizar cualquier código, evaluando cuáles aplican realmente a este proyecto (React con componentes funcionales y hooks, Express con capas de rutas/cliente/config en el backend) y cuáles serían over-engineering para el caso puntual. Esto sigue la regla del CLAUDE.md global: invocar la skill `solid-principles` al empezar la tarea de código y de nuevo al terminarla, para cerrar con el checklist de principios aplicados (o descartados a propósito, con motivo).

## ERRORS

Siempre que tengas un error, vas a actualizar aquí en el CLAUDE.md: cuál era el error y cómo lo resolviste. 

### El dev server de Vite ignora `build.rollupOptions.input`

Al separar el frontend en dos apps (Sprint 1 Part B, `vite.staff.config.ts` con `build.rollupOptions.input: 'index.staff.html'`), correr `npm run dev:staff` y abrir `http://localhost:5174/` mostraba la app de **cliente**, no la de staff. Causa: `rollupOptions.input` es una opción exclusiva de `vite build` — el dev server de Vite siempre sirve `index.html` en la ruta `/`, sin importar ese setting; solo serviría `index.staff.html` si se navegaba manualmente a esa ruta exacta. Se resolvió agregando un plugin mínimo con `configureServer` en `vite.staff.config.ts` que reescribe `req.url` de `/` a `/index.staff.html` (solo afecta al dev server, no a `vite build`). Moraleja: en un proyecto multi-entrada con Vite, verificar el comportamiento real del dev server en `/` — no asumir que `build.rollupOptions.input` alcanza para que ambos modos (dev y build) sirvan la entrada correcta.

### `prisma migrate dev` falla en este entorno (sin TTY) — flujo manual de migración

Al agregar la numeración de pedidos por jornada (branch `recepcionista`), `npx prisma migrate dev --name ...` tiró `Error: Prisma Migrate has detected that the environment is non-interactive, which is not supported` — necesitaba confirmar interactivamente una advertencia de posible pérdida de datos (agregar una columna `NOT NULL` a una tabla con filas existentes) y este entorno de trabajo no tiene una terminal interactiva real (ni siquiera `yes | npx prisma migrate dev ...` sirve, porque el chequeo es de TTY, no de stdin). `prisma migrate diff` tampoco sirvió directo acá porque pide un `shadowDatabaseUrl` que no está configurado. El flujo manual que sí funciona:

1. Escribir el `migration.sql` a mano, en una carpeta nueva bajo `prisma/migrations/` con el formato `YYYYMMDDHHMMSS_nombre` — usar `date -u +%Y%m%d%H%M%S` (UTC) para el timestamp, no `date` a secas, porque Prisma genera sus propios timestamps en UTC y mezclar UTC con hora local puede desordenar el historial de migraciones.
2. Aplicar ese SQL directo contra la base con `psql` (acá, el binario de la instalación EDB: `/Library/PostgreSQL/18/bin/psql`), no con el CLI de Prisma.
3. Avisarle a Prisma que ya se aplicó: `npx prisma migrate resolve --applied <nombre_de_la_carpeta>` (esto solo actualiza la tabla `_prisma_migrations`, no toca el esquema).
4. `npm run db:generate` para regenerar el Client.
5. Verificar con `npx prisma migrate status` que quedó "Database schema is up to date!" sin drift.

Para agregar una columna `NOT NULL` a una tabla con filas existentes (imposible en un solo paso sin un default), partir la migración en 2: primero agregarla opcional + backfillear los datos existentes con un script puntual (que se corre una vez y se borra), después una segunda migración que la vuelve `NOT NULL`. Ver el ejemplo real de esto en `add_order_number_reset_step1`/`step2`.

### Prisma Client no se regenera solo tras `db:migrate`

Este mismo archivo decía (línea de `db:generate` en "Commands") que el cliente se regenera automáticamente después de `db:migrate`. En la práctica, al agregar el modelo `User` (Sprint 1, autenticación) y correr `npm run db:migrate --prefix server`, la migración se aplicó bien pero `server/src/generated/prisma` quedó con el snapshot viejo — `npm run typecheck --prefix server` tiraba `Module '"../generated/prisma/client.js"' has no exported member 'User'` y `Property 'user' does not exist on type 'PrismaClient'`. Se resolvió corriendo `npm run db:generate --prefix server` a mano después de la migración. Moraleja: después de cualquier `db:migrate` que agregue/cambie un modelo, correr `db:generate` explícitamente antes de asumir que el Client ya está al día — no confiar en que se disparó solo.

### El cron de auto-deploy se trabó en loop por drift de `package-lock.json`

El 1/8/2026, al mergear a `main` la rama con el carrusel de fotos/opciones de producto (ver
migraciones `add_product_images`/`add_product_options`) más lo de esta sesión, el cliente
reportó pantalla en blanco al entrar a "Menú" (cliente) y "Nuevo pedido" (cocina) — ambas
pantallas usan `useProducts()` y hacen `product.optionGroups.length` apenas cargan el catálogo.
Causa real: `server/scripts/deploy.sh` usaba `git pull origin main`, y el `npm install` de cada
corrida anterior regeneraba `server/package-lock.json` con pequeñas diferencias respecto al
commiteado (versión de npm/plataforma del droplet vs. la que generó el lockfile), dejando el
working tree del droplet sucio. Como el commit nuevo también tocaba ese archivo, `git pull`
(es un merge) se negó a pisar el cambio local no commiteado y abortó — en loop, cada 5 min,
durante casi una hora (`/var/log/los-hermanos-deploy.log`, 17:45 a 18:30 UTC), sin que nada lo
frenara porque el script no distingue "conflicto real" de "drift de un build artifact". El
backend quedó 3 commits atrás, sirviendo productos con el shape viejo (`image` string) mientras
el frontend (Netlify, deploy independiente y mucho más rápido) ya esperaba `images`/
`optionGroups` — de ahí el `undefined.length` y la pantalla en blanco (no hay Error Boundary).
Se resolvió en dos partes: (1) en el droplet, `git checkout -- server/package-lock.json` +
correr `deploy.sh` a mano para destrabar ya; (2) en el script, cambiar `git pull origin main`
por `git reset --hard "$REMOTE_SHA"` — este checkout es solo para deploy (nadie edita nada ahí
a mano), así que cualquier drift local tiene que descartarse siempre, nunca bloquear. Moraleja:
un pipeline de auto-deploy que hace `npm install` en el propio checkout de git no puede usar
`git pull` para traer el commit nuevo — el lockfile (o cualquier archivo que el install toque)
va a driftear tarde o temprano y trabar el merge. `git reset --hard` contra el SHA remoto es lo
correcto ahí. También: la ventana de "Netlify ya deployeó, el droplet todavía no" (hasta 5 min,
peor caso) puede producir mismatches de shape API real entre frontend y backend — tenerlo en
cuenta antes de asumir que un error recién reportado después de un merge a main es un bug de
código y no un problema de deploy en curso.

### El flujo manual de migración (sin TTY) solo tocó la base de dev, no la de test

Al agregar `OrderItem.notes` (aclaraciones por ítem, 1/8/2026) se siguió el flujo manual de migración de más arriba (`migration.sql` a mano + `psql` + `prisma migrate resolve --applied` + `db:generate`), pero ese `psql`/`migrate resolve` se corrió solo contra `DATABASE_URL` de `server/.env` (la base de **desarrollo**, `los_hermanos`). Quedó sin aplicar contra `los_hermanos_test` (`server/.env.test`), que es la que usa `npm test --prefix server`. No se notó en el momento porque en esa sesión no se corrió la suite de tests del backend, solo `typecheck` — recién se descubrió sesiones después, al correr `npm test --prefix server` completo, con 9 tests de `orders/service.test.ts` fallando con `The column "notes" of relation "order_items" does not exist in the current database`. Se resolvió repitiendo el mismo `psql -f migration.sql` y `prisma migrate resolve --applied <nombre>` contra `los_hermanos_test`, pasando `DATABASE_URL` de esa base explícitamente en el comando (ya que el `.env` por defecto que lee el CLI de Prisma es el de dev). Moraleja: cualquier migración manual (sin TTY) tiene que aplicarse a **las dos bases** (`los_hermanos` y `los_hermanos_test`), no solo a la de dev — y conviene correr `npm test --prefix server` (no solo `typecheck`) después de una migración nueva, antes de dar la tarea por terminada, para no arrastrar este tipo de desfasaje a una sesión futura.

### Procesos y dev server

- NUNCA dejes procesos de Next.js corriendo en background. Si lanzas `next dev` o `next build`, asegúrate de terminar el proceso cuando acabes.
- Antes de correr `next build`, verifica si ya hay un build corriendo con `ps aux | grep "next build"`. Sí lo hay, matalo primero.
- Antes de correr 'next dev", verifica si ya hay un dev server corriendo con "Isof -1 :3000 . Si lo hay, mátalo primero.
- NUNCA lances múltiples `next build` en paralelo sobre el mismo proyecto.
- Si necesitas reiniciar el dev server, mata el anterior explícitamente antes de lanzar uno nuevo.
- Después de terminar una tarea que involucró correr Next. js, confirma que los procesos fueron terminados.

### Subagents y Agent Teams
- Después de usar Agent tool o Agent Teams, SIEMPRE verifica que no quedaron procesos huérfanos: `ps aux | grep "claude.*stream-json" | grep -v grep | wc -l`
- Si quedaron procesos, mátalos con: `ps aux | grep "claude. *stream-json" | grep -v grep | awk '{print $2}' 1 xargs kill -9°`
- Limita Agent Teams a máximo 5 agentes simultáneos (10+ causa problemas de memoria)
- Prefiere subagents normales sobre Agent Teams para tareas de investigación - se cierran más limpiamente.
- NUNCA lances Agent Teams sin un plan para cerrarlos después.