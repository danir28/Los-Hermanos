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

Backend (`server/`):
- `npm i` (inside `server/`) — install backend dependencies
- `npm run dev` — start the API with hot reload (http://localhost:4000)
- `npm run build` / `npm run start` — compile to `dist/` and run it
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:migrate` — create/apply a Prisma migration from `prisma/schema.prisma` (needs `DATABASE_URL` in `server/.env`)
- `npm run db:generate` — regenerate the Prisma Client into `src/generated/prisma`. Run this explicitly after every `db:migrate` — in practice it does **not** reliably auto-run (see ERRORS below), so don't assume the Client is in sync just because the migration applied.
- `npm run db:studio` — open Prisma Studio (GUI to browse/edit the DB)
- `npm run db:seed` — idempotent upsert of one staff user from `SEED_ADMIN_{NOMBRE,USUARIO,EMAIL,PASSWORD,ROL}` env vars (no CRUD screen yet — this is the only way to create staff accounts)

There is no test suite and no JS/TS linter configured in any package — only `typecheck` and `lint:css` are available as checks. **Three dev servers now need to run simultaneously** (in separate terminals) for a full local setup: backend (`server/`, port 4000), cliente (port 5173), staff (port 5174) — plus Postgres running for the backend to start correctly.

## Architecture

**Two separate frontend apps share one `src/` tree, split by who's allowed to see what (Sprint 1 Part B):**
- **Cliente** (`src/app/AppCliente.tsx`, entry `index.html` → `src/main.cliente.tsx`, built by `vite.cliente.config.ts`): public, no login, no staff code. Owns `customerView`/`cart`/`confirmedOrder` state and the cart/checkout mutation functions.
- **Staff** (`src/app/AppStaff.tsx`, entry `index.staff.html` → `src/main.staff.tsx`, built by `vite.staff.config.ts`): recepción/cocina/admin, always behind `AuthProvider`/`LoginScreen` (`src/app/auth/`). Owns `activeSection`/`staffView`/`orders` state and the order-mutation functions (these now require a token).

**The split is structural, not just organizational**: each entry file only imports its own app component transitively, so it's not possible for the cliente bundle to accidentally pull in staff code (or vice versa) — verified after every build by grepping `dist/`/`dist-staff/` for strings unique to the other app (e.g. `"Ingreso de personal"` must be in `dist-staff` only). `vite.shared.ts` holds the config both builds have in common (the `figma-asset-resolver` plugin, the `@` alias, `assetsInclude`) so it isn't duplicated. **Gotcha:** Vite's dev server always serves `index.html` at `/` regardless of `build.rollupOptions.input` (that setting is build-only) — `vite.staff.config.ts` works around this with a `configureServer` middleware that rewrites `/` → `/index.staff.html` in dev, so `npm run dev:staff` shows the staff app at its own root instead of the cliente app.

Screens still live one folder per role/persona under `src/app/`, and both apps import from the same set of folders:

- `src/app/cliente/` — `CustomerHome`, `CustomerMenu`, `CustomerCart`, `CustomerConfirmation`, `CustomerTracking`, plus `statusMessages.ts` (customer-facing copy per `OrderStatus`). Barrel export in `index.ts`. Only `AppCliente` imports this folder.
- `src/app/auth/` (Sprint 1 Part B, staff-only) — `AuthContext.tsx` (`AuthProvider`/`useAuth()`: token in `localStorage`, validated against `GET /api/auth/me` on mount, `login()`/`logout()`), `LoginScreen.tsx`. Barrel export in `index.ts`. Only `AppStaff` imports this folder.
- `src/app/recepcionista/` — `ReceptionistDashboard`, `ReceptionistOrders`, `ReceptionistCreateOrder`. Barrel export in `index.ts`.
- `src/app/cocina/` — `KitchenPanel`, `KitchenAssign`, `KitchenKanban`, plus small extracted helpers: `AgeIndicator.tsx` (urgency pill), `kanbanConfig.ts` (columns/next-state/cancel rules), `reprogReasons.ts`, `timeAgo.ts`. Barrel export in `index.ts`.
- `src/app/admin/` — `AdminDashboard`, `AdminReports`, `AdminIntegrations` (+ `IntegrationBadge.tsx`). `AdminReports`/`AdminIntegrations` read the token via `useAuth()` since their backend routes are admin-only. Barrel export in `index.ts`.
- `src/app/components/shared/` — `StatusBadge`, `TypePill`, `RoleNavTabs`, used across roles. Barrel export in `index.ts`.
- `src/app/data/` — `products.ts` (`PRODUCTS`, `CATEGORIES`), `sampleOrders.ts` (`SAMPLE_ORDERS`, no longer used to seed `orders` state — real orders come from the backend), `statusConfig.ts` (`STATUS` map: color/icon/label per `OrderStatus`).
- `src/app/types.ts` — shared domain types: `Product`, `Order`, `CartItem`, `OrderStatus`, `OrderType`, `StatusCfg`.
- `src/app/lib/` — `format.ts` (`formatCurrency`), `api.ts` (backend fetch wrapper — `authLogin`/`authMe`/`authLogout`/`ordersLookup` are public; `ordersList`/`ordersUpdate`/`reportsMonthly`/`fudoStatus`/`fudoSync`/`whatsappStatus`/`whatsappNotify` all take a `token` as their first, explicit argument rather than reading it from hidden module state — keeps `api.ts` shared safely between the two apps without one leaking session state into the other).

When making changes, go straight to the relevant role folder rather than searching `AppCliente`/`AppStaff` — neither contains section banners; each screen is its own file.

There is no router (react-router is a dependency but unused here). Navigation is plain `useState` + conditional rendering:
- `AppCliente`: `customerView` drives the customer sub-views (`home`, `menu`, `cart`, `confirmation`, `tracking`)
- `AppStaff`: the section (recepción/cocina/admin) is not its own state — it's always exactly `user.rol`, with no UI to switch between sections, for any role including admin (explicit product decision: an admin account only administers, it doesn't also supervise recepción/cocina from the same login). `staffView` drives the sub-views within that fixed section (dashboard/orders/create, panel/assign/kanban, dashboard/reportes/integraciones); `SECTION_LABEL` just picks the header icon/label for the logged-in role.
- Section components receive state and setters as props from the app component (e.g. `cart`, `orders`, `onNavigate`) rather than reading from context — no global store, except for auth (`useAuth()`, staff-only)

All catalog data (`PRODUCTS`) is still hardcoded in `src/app/data/` and not yet wired to the backend sync (see below) — but `Order`/`OrderItem` are real, backed by Postgres via `src/app/lib/api.ts`. Order status transitions (`Pendiente → Programado → En preparación → Listo para retirar → Entregado`, or `Cancelado`) are modeled via the `OrderStatus` union.

Other files:
- `src/main.cliente.tsx` / `src/main.staff.tsx` — entry points, mount `<AppCliente />` / `<AppStaff />` respectively
- `src/app/components/ui/*` — shadcn/Radix primitives (button, dialog, card, etc.); mostly unused by the app currently but available for use
- `src/app/components/figma/ImageWithFallback.tsx` — image component from the original Figma export
- `src/styles/theme.css` — CSS custom properties for the design system (colors, radius, chart colors); `:root` is the light theme, `.dark` variants exist for dark mode
- `src/styles/index.css` — imports fonts, tailwind, theme in that order

## Backend (`server/`)

Separate Express + TypeScript app, not part of the Vite build, run independently (`server/package.json`, own `tsconfig.json`). It exists because integrating FUDO and the WhatsApp agent both require holding API keys and (for WhatsApp) receiving inbound webhooks — neither is safe to do from the browser. Config/secrets live in `server/.env` (see `server/.env.example`), never in frontend code.

- `src/config.ts` — reads env vars, exposes `isFudoConfigured()` / `isWhatsappConfigured()`; also builds `config.jwt.{secret,expiresIn}` and throws at startup if `JWT_SECRET` is unset, and splits `CORS_ORIGIN` into a `string[]` (one entry per allowed origin — the two Netlify sites)
- `src/db.ts` — exports the singleton `db` (Prisma Client), constructed with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter — there's no built-in query engine binary anymore; the connection string comes from `DATABASE_URL`)
- `src/auth/` — real authentication (Sprint 1), same `{routes,service,middleware,types}.ts` shape as the rest of the backend. `service.ts` (`login()` bcrypt-compares and signs an HS256 JWT `{ sub, usuario, rol }`, `getUserById()` re-reads from the DB for `/me`), `middleware.ts` (`requireAuth` fills `req.user` straight from the JWT — no DB hit per request, so a deactivated user keeps access until their token expires naturally; `requireRole(...roles)` for 403s), `routes.ts` (`POST /login`, `GET /me` protected, `POST /logout` — client-side-only, no revoked-token table). `src/types/express.d.ts` augments `Request.user: AuthUser`.
- `src/lib/asyncHandler.ts` — wraps an async Express handler so a rejected promise reaches `next(err)` instead of hanging the request; paired with the global error-handling middleware at the end of `index.ts`. Applied to `orders` POST/GET/`lookup` and to `auth` routes so far — not yet to `fudo`/`whatsapp` (known gap, see Domain model section).
- `src/integrations/fudo/` — `types.ts` (provisional shape, no FUDO API docs yet), `client.ts` (`fetchFudoProducts()`, throws `FudoNotConfiguredError` when unset), `routes.ts` (`GET /status`, `POST /sync` upserts into the `FudoProduct` table, `GET /products`) — whole router requires `requireAuth` + role `admin`
- `src/integrations/whatsapp/` — talks to the WhatsApp **agent's** API (the agent owns the Twilio connection), not Twilio directly. `client.ts` (`sendWhatsappMessage()`), `routes.ts` (`GET /status`, `POST /notify` — both require `requireAuth` + role `admin`; `POST /webhook` — the agent calls this when a message/order comes in, persisted as-is into `WhatsappInboundEvent`, **stays public**, gated only by its own `x-webhook-secret` header, since it's called by the agent, not a logged-in employee)
- `src/index.ts` — Express app, mounts `/api/auth`, `/api/fudo`, `/api/whatsapp`, `/api/orders`, `/api/reports`, plus `GET /api/health`; global error-handling middleware at the end catches whatever `asyncHandler` forwards; disconnects Prisma on `SIGINT`/`SIGTERM`

Both integrations are **scaffolded but not connected to real accounts** — no FUDO API docs and no finalized contract with the WhatsApp agent yet. Endpoints return a clear 400 error ("no configurado") instead of calling out, so the rest of the system stays usable without credentials. When wiring in real ones: update `server/.env`, and for FUDO adjust the field mapping in `fudo/client.ts`'s `mapProduct()` once the real response shape is known; for WhatsApp adjust the payload shape in `whatsapp/routes.ts`'s `/webhook` handler once the agent's contract is defined.

The frontend's `AdminIntegrations` component (Admin → Integraciones tab) surfaces connection status and lets staff trigger a FUDO sync — it never handles secrets itself, only calls the backend. **Note:** as of Sprint 1 Part A, `fudoStatus`/`fudoSync`/`whatsappStatus`/`whatsappNotify` all require an admin JWT — this component isn't updated to send one yet (that's Sprint 1 Part B, the frontend split, not yet done).

### Database (Postgres + Prisma)

Local Postgres 18 (installed via the EDB macOS installer, `/Library/PostgreSQL/18`), accessed through a dedicated `los_hermanos_app` role/database — never through the `postgres` superuser. Schema lives in `server/prisma/schema.prisma`; migrations in `server/prisma/migrations/` (committed to git, generated code in `server/src/generated/prisma` is not).

Prisma 7 config split: `server/prisma.config.ts` holds `DATABASE_URL` for the CLI (`migrate`/`studio`), while `PrismaClient` at runtime needs an explicit `adapter` (see `src/db.ts`) — this is new in Prisma 7 and easy to get wrong if copying older Prisma examples from memory.

Current tables (intentionally scoped to what the integrations need, plus the new `User` table for auth — **the rest of the app's core domain (products/categories) still isn't backed by the DB**):
- `FudoProduct` (`fudo_products`) — latest known FUDO catalog snapshot, upserted by `externalId` on every sync, no history kept
- `WhatsappInboundEvent` (`whatsapp_inbound_events`) — raw events the WhatsApp agent posts to the webhook, unprocessed
- `WhatsappOutboundMessage` (`whatsapp_outbound_messages`) — audit log of every notify attempt (success or failure)
- `Order` (`orders`) / `OrderItem` (`order_items`) — real order data (Sprint before this one); `orderNumber` is the autoincrement correlative shown in the UI as `"007"`
- `User` (`users`, Sprint 1) — staff accounts (`recepcionista`/`cocina`/`admin`, validated in TS via `auth/types.ts`'s `USER_ROLES`, not as a DB enum — same convention as `Order.status`/`Order.type`). No CRUD screen yet: accounts are only created via `server/prisma/seed.ts` (`npm run db:seed --prefix server`, reads `SEED_ADMIN_{NOMBRE,USUARIO,EMAIL,PASSWORD,ROL}` from `server/.env`, idempotent upsert by `usuario`)

`npx prisma migrate dev` requires the app role to have `CREATEDB` (Postgres needs it to spin up a throwaway shadow database for diffing) — this was granted once manually via `ALTER ROLE los_hermanos_app CREATEDB;`, run as the `postgres` superuser through pgAdmin.

### Domain model — not yet built

`server/` currently only has tables for the FUDO/WhatsApp integrations, plus `Order`/`OrderItem`/`User` (see above). Product/category catalog data is **still hardcoded in `src/app/data/products.ts`** and not backed by the database yet — that's a deliberately separate, larger piece of work (new Prisma models + CRUD endpoints + migrating that data off a hardcoded array).

The client provided a requirements document (products/categories catalog, cart-based ordering, order lifecycle status tracking, receptionist/kitchen/admin roles, WhatsApp order intake) that should inform that schema when it's tackled.

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

### Prisma Client no se regenera solo tras `db:migrate`

Este mismo archivo decía (línea de `db:generate` en "Commands") que el cliente se regenera automáticamente después de `db:migrate`. En la práctica, al agregar el modelo `User` (Sprint 1, autenticación) y correr `npm run db:migrate --prefix server`, la migración se aplicó bien pero `server/src/generated/prisma` quedó con el snapshot viejo — `npm run typecheck --prefix server` tiraba `Module '"../generated/prisma/client.js"' has no exported member 'User'` y `Property 'user' does not exist on type 'PrismaClient'`. Se resolvió corriendo `npm run db:generate --prefix server` a mano después de la migración. Moraleja: después de cualquier `db:migrate` que agregue/cambie un modelo, correr `db:generate` explícitamente antes de asumir que el Client ya está al día — no confiar en que se disparó solo.

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