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

**Almost the entire application lives in one file: `src/app/App.tsx` (~1700 lines).** This is not an oversight — it's the current structure. When making changes, locate the relevant section by its banner comment (`// ─── Section Name ───`) rather than assuming a separate file exists. Sections, in order:

- Types / Static Data / Utilities (top of file) — `Product`, `Order`, `CartItem` types, the in-memory `PRODUCTS` and `SAMPLE_ORDERS` arrays, `formatCurrency`, `STATUS`/`STATUS_MESSAGES` maps, `StatusBadge`, `TypePill`
- **Customer**: `CustomerHome`, `CustomerMenu`, `CustomerCart`, `CustomerConfirmation`, `CustomerTracking`
- **Receptionist** (`recepcionista`): `ReceptionistDashboard`, `ReceptionistOrders`, `ReceptionistCreateOrder`
- **Kitchen** (`cocina`): `KitchenPanel`, `KitchenAssign`, `KitchenKanban`
- **Admin**: `AdminDashboard`, `AdminProducts`, `AdminCategories`, `AdminIntegrations` (+ `IntegrationBadge` helper)
- **Main App** (`export default function App()`) at the bottom — owns all top-level state and renders the role-based nav + view switch

There is no router (react-router is a dependency but unused here). Navigation is plain `useState` + conditional rendering:
- `role` switches between four top-level personas: `cliente`, `recepcionista`, `cocina`, `admin`
- `customerView` drives the customer sub-views (`home`, `menu`, `cart`, `confirmation`, `tracking`)
- `staffView` drives the sub-views for whichever staff role is active (dashboard/orders/create, panel/assign/kanban, dashboard/products/categories/integraciones)
- Section components receive state and setters as props from `App` (e.g. `cart`, `orders`, `onNavigate`) rather than reading from context — there is no global store.

All data (`PRODUCTS`, `SAMPLE_ORDERS`) is still hardcoded in-file and not yet wired to the backend sync (see below). Order status transitions (`Pendiente → Programado → En preparación → Listo para retirar → Entregado`, or `Cancelado`) are modeled via the `OrderStatus` union and mutated in local component state in `App`.

Other files:
- `src/main.tsx` — entry point, mounts `<App />`
- `src/app/lib/api.ts` — thin `fetch` wrapper for calling the backend (`VITE_API_URL`, default `http://localhost:4000`); used by `AdminIntegrations`
- `src/app/components/ui/*` — shadcn/Radix primitives (button, dialog, card, etc.); mostly unused by `App.tsx` currently but available for use
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