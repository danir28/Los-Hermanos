import type { AuthUser } from "../auth/types.js";

// Amplía Request para que req.user (llenado por auth/middleware.ts#requireAuth) tipe
// bien en todos los routers, sin que cada uno tenga que castear req manualmente.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
