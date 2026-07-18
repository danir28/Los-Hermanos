import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { AuthUser, UserRole } from "./types.js";

// Verifica el JWT del header "Authorization: Bearer <token>" y llena req.user con lo
// que el propio token trae (sub/usuario/rol). A propósito NO vuelve a consultar la DB
// en cada request (eso anularía buena parte del punto de usar JWT): un usuario
// desactivado mantiene acceso hasta que su token expire naturalmente (≤8hs). El chequeo
// de "activo" solo ocurre en login y en /me (ver auth/service.ts).
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Falta el token de autenticación" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as { sub: string; usuario: string; rol: UserRole };
    req.user = { id: payload.sub, usuario: payload.usuario, rol: payload.rol };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Exige que req.user (ya llenado por requireAuth) tenga uno de los roles permitidos.
// Depende del tipo AuthUser, no de una entidad de Prisma, para no acoplar los routers
// a la capa de datos.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: AuthUser | undefined = req.user;
    if (!user || !roles.includes(user.rol)) {
      res.status(403).json({ error: "No tenés permiso para acceder a este recurso" });
      return;
    }
    next();
  };
}
