# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rotisería Los Hermanos App — a restaurant ordering/management app, originally generated from a Figma design (via Figma Make). React 18 + TypeScript + Vite + Tailwind v4, using shadcn/Radix UI components, plus a small Express/TypeScript backend in `server/` for external integrations. All copy/UI text is in Spanish (es-AR).

## Commands

Frontend (repo root):
- `npm i` — install dependencies
- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — production build (`vite build`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint:css` — stylelint over `src/**/*.css`

Backend (`server/`):
- `npm i` (inside `server/`) — install backend dependencies
- `npm run dev` — start the API with hot reload (http://localhost:4000)
- `npm run build` / `npm run start` — compile to `dist/` and run it
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:migrate` — create/apply a Prisma migration from `prisma/schema.prisma` (needs `DATABASE_URL` in `server/.env`)
- `npm run db:generate` — regenerate the Prisma Client into `src/generated/prisma` (also runs automatically after `db:migrate`)
- `npm run db:studio` — open Prisma Studio (GUI to browse/edit the DB)

There is no test suite and no JS/TS linter configured in either package — only `typecheck` and `lint:css` are available as checks. Both dev servers need to run simultaneously (in separate terminals) for the frontend to talk to the backend, and Postgres needs to be running for the backend to start correctly.

## Architecture

**The app is split by role into folders under `src/app/`.** `App.tsx` itself is now small (~190 lines): it only owns top-level state (`role`, `customerView`, `staffView`, `cart`, `orders`, etc.), the cart/order mutation functions, and the role-based nav + view switch that renders the right section component. All the actual screens live one folder per role:

- `src/app/cliente/` — `CustomerHome`, `CustomerMenu`, `CustomerCart`, `CustomerConfirmation`, `CustomerTracking`, plus `statusMessages.ts` (customer-facing copy per `OrderStatus`). Barrel export in `index.ts`.
- `src/app/recepcionista/` — `ReceptionistDashboard`, `ReceptionistOrders`, `ReceptionistCreateOrder`. Barrel export in `index.ts`.
- `src/app/cocina/` — `KitchenPanel`, `KitchenAssign`, `KitchenKanban`, plus small extracted helpers: `AgeIndicator.tsx` (urgency pill), `kanbanConfig.ts` (columns/next-state/cancel rules), `reprogReasons.ts`, `timeAgo.ts`. Barrel export in `index.ts`.
- `src/app/admin/` — `AdminDashboard`, `AdminProducts`, `AdminCategories`, `AdminIntegrations`, plus `IntegrationBadge.tsx`. Barrel export in `index.ts`.
- `src/app/components/shared/` — `StatusBadge`, `TypePill`, used across roles. Barrel export in `index.ts`.
- `src/app/data/` — `products.ts` (`PRODUCTS`, `CATEGORIES`), `sampleOrders.ts` (`SAMPLE_ORDERS`), `statusConfig.ts` (`STATUS` map: color/icon/label per `OrderStatus`).
- `src/app/types.ts` — shared domain types: `Product`, `Order`, `CartItem`, `OrderStatus`, `OrderType`, `StatusCfg`.
- `src/app/lib/` — `format.ts` (`formatCurrency`), `api.ts` (backend fetch wrapper).

When making changes, go straight to the relevant role folder rather than searching `App.tsx` — it no longer contains section banners; each screen is its own file.

There is no router (react-router is a dependency but unused here). Navigation is plain `useState` + conditional rendering, owned by `App`:
- `role` switches between four top-level personas: `cliente`, `recepcionista`, `cocina`, `admin`
- `customerView` drives the customer sub-views (`home`, `menu`, `cart`, `confirmation`, `tracking`)
- `staffView` drives the sub-views for whichever staff role is active (dashboard/orders/create, panel/assign/kanban, dashboard/products/categories/integraciones)
- Section components receive state and setters as props from `App` (e.g. `cart`, `orders`, `onNavigate`) rather than reading from context — there is no global store.

All data (`PRODUCTS`, `SAMPLE_ORDERS`) is still hardcoded in `src/app/data/` and not yet wired to the backend sync (see below). Order status transitions (`Pendiente → Programado → En preparación → Listo para retirar → Entregado`, or `Cancelado`) are modeled via the `OrderStatus` union and mutated in local component state in `App`.

Other files:
- `src/main.tsx` — entry point, mounts `<App />`
- `src/app/components/ui/*` — shadcn/Radix primitives (button, dialog, card, etc.); mostly unused by the app currently but available for use
- `src/app/components/figma/ImageWithFallback.tsx` — image component from the original Figma export
- `src/styles/theme.css` — CSS custom properties for the design system (colors, radius, chart colors); `:root` is the light theme, `.dark` variants exist for dark mode
- `src/styles/index.css` — imports fonts, tailwind, theme in that order

## Backend (`server/`)

Separate Express + TypeScript app, not part of the Vite build, run independently (`server/package.json`, own `tsconfig.json`). It exists because integrating FUDO and the WhatsApp agent both require holding API keys and (for WhatsApp) receiving inbound webhooks — neither is safe to do from the browser. Config/secrets live in `server/.env` (see `server/.env.example`), never in frontend code.

- `src/config.ts` — reads env vars, exposes `isFudoConfigured()` / `isWhatsappConfigured()`
- `src/db.ts` — exports the singleton `db` (Prisma Client), constructed with the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter — there's no built-in query engine binary anymore; the connection string comes from `DATABASE_URL`)
- `src/integrations/fudo/` — `types.ts` (provisional shape, no FUDO API docs yet), `client.ts` (`fetchFudoProducts()`, throws `FudoNotConfiguredError` when unset), `routes.ts` (`GET /status`, `POST /sync` upserts into the `FudoProduct` table, `GET /products`)
- `src/integrations/whatsapp/` — talks to the WhatsApp **agent's** API (the agent owns the Twilio connection), not Twilio directly. `client.ts` (`sendWhatsappMessage()`), `routes.ts` (`GET /status`, `POST /webhook` — the agent calls this when a message/order comes in, persisted as-is into `WhatsappInboundEvent`; `POST /notify` — this system asks the agent to send a message, logged into `WhatsappOutboundMessage` whether it succeeds or fails)
- `src/index.ts` — Express app, mounts `/api/fudo` and `/api/whatsapp`, plus `GET /api/health`; disconnects Prisma on `SIGINT`/`SIGTERM`

Both integrations are **scaffolded but not connected to real accounts** — no FUDO API docs and no finalized contract with the WhatsApp agent yet. Endpoints return a clear 400 error ("no configurado") instead of calling out, so the rest of the system stays usable without credentials. When wiring in real ones: update `server/.env`, and for FUDO adjust the field mapping in `fudo/client.ts`'s `mapProduct()` once the real response shape is known; for WhatsApp adjust the payload shape in `whatsapp/routes.ts`'s `/webhook` handler once the agent's contract is defined.

The frontend's `AdminIntegrations` component (Admin → Integraciones tab) surfaces connection status and lets staff trigger a FUDO sync — it never handles secrets itself, only calls the backend.

### Database (Postgres + Prisma)

Local Postgres 18 (installed via the EDB macOS installer, `/Library/PostgreSQL/18`), accessed through a dedicated `los_hermanos_app` role/database — never through the `postgres` superuser. Schema lives in `server/prisma/schema.prisma`; migrations in `server/prisma/migrations/` (committed to git, generated code in `server/src/generated/prisma` is not).

Prisma 7 config split: `server/prisma.config.ts` holds `DATABASE_URL` for the CLI (`migrate`/`studio`), while `PrismaClient` at runtime needs an explicit `adapter` (see `src/db.ts`) — this is new in Prisma 7 and easy to get wrong if copying older Prisma examples from memory.

Current tables (intentionally scoped to what the integrations need — **not yet the app's core domain**):
- `FudoProduct` (`fudo_products`) — latest known FUDO catalog snapshot, upserted by `externalId` on every sync, no history kept
- `WhatsappInboundEvent` (`whatsapp_inbound_events`) — raw events the WhatsApp agent posts to the webhook, unprocessed
- `WhatsappOutboundMessage` (`whatsapp_outbound_messages`) — audit log of every notify attempt (success or failure)

`npx prisma migrate dev` requires the app role to have `CREATEDB` (Postgres needs it to spin up a throwaway shadow database for diffing) — this was granted once manually via `ALTER ROLE los_hermanos_app CREATEDB;`, run as the `postgres` superuser through pgAdmin.

### Domain model — not yet built

`server/` currently only has tables for the FUDO/WhatsApp integrations. The app's actual business data (products, categories, orders, order items, business hours, internal users) is **still hardcoded in `App.tsx`** and not backed by the database yet — that's a deliberately separate, larger piece of work (new Prisma models + CRUD endpoints + migrating `App.tsx` off local `useState`/hardcoded arrays).

The client provided a requirements document (products/categories catalog, cart-based ordering, order lifecycle status tracking, receptionist/kitchen/admin roles, WhatsApp order intake) that should inform that schema when it's tackled. One gap worth flagging: RNF-01 requires hashed passwords for internal users, but there is currently **no authentication system at all** — the four roles in the UI (`cliente`/`recepcionista`/`cocina`/`admin`) are just tabs anyone can click, with no login. A `users` table + auth flow is in scope per the requirements but not yet designed or built.

## Build/tooling notes

- Vite config (`vite.config.ts`) has a custom `figma-asset-resolver` plugin that resolves `figma:asset/*` imports to `src/assets/*` — needed for images carried over from the Figma export. Don't remove it even if currently unused.
- The React and Tailwind Vite plugins must stay even if Tailwind classes appear unused in a given moment — this is required for the Figma Make pipeline.
- Path alias `@/*` → `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).
- Only `.svg` and `.csv` are configured for raw asset imports — never add `.css`, `.tsx`, or `.ts` to `assetsInclude`.
- Styling is Tailwind v4 (CSS-based config, no `tailwind.config.js`) plus CSS variables from `theme.css` for theme tokens (`bg-primary`, `text-muted-foreground`, etc. map to those variables).

## Estándares de código

Cada vez que se pida escribir, modificar o refactorizar código en este proyecto (frontend o backend), seguir siempre estos tres pasos:

1. **Acomodar**: ubicar el código nuevo o modificado en el lugar que corresponde — la sección correcta de `App.tsx` (por su banner comment `// ─── Section Name ───`) o el archivo correspondiente dentro de `server/src/`, sin mezclar responsabilidades entre capas (UI, lógica de negocio, acceso a datos/integraciones).
2. **Verificar**: antes de dar la tarea por terminada, correr `npm run typecheck` (frontend y/o `server/`, según lo que se haya tocado) y `npm run lint:css` si se modificaron estilos. No hay test suite todavía, así que estos checks son la única red de seguridad automática — no omitirlos.
3. **Principios de diseño**: tener siempre presentes los principios SOLID, los patrones de diseño y las buenas prácticas de diseño de software al escribir o refactorizar cualquier código, evaluando cuáles aplican realmente a este proyecto (React con componentes funcionales y hooks, Express con capas de rutas/cliente/config en el backend) y cuáles serían over-engineering para el caso puntual. Esto sigue la regla del CLAUDE.md global: invocar la skill `solid-principles` al empezar la tarea de código y de nuevo al terminarla, para cerrar con el checklist de principios aplicados (o descartados a propósito, con motivo).

## ERRORS

Siempre que tengas un error, vas a actualizar aquí en el CLAUDE.md: cuál era el error y cómo lo resolviste. 

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