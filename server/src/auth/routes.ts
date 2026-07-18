import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getUserById, InactiveUserError, InvalidCredentialsError, login } from "./service.js";
import { requireAuth } from "./middleware.js";
import type { LoginInput } from "./types.js";

export const authRouter = Router();

// Valida usuario/contraseña y devuelve un JWT (8hs) + el perfil del usuario logueado.
authRouter.post("/login", asyncHandler(async (req, res) => {
  const { usuario, password } = req.body as Partial<LoginInput>;
  if (!usuario || !password) {
    res.status(400).json({ error: 'Faltan los campos "usuario" y "password"' });
    return;
  }

  try {
    const result = await login(usuario, password);
    res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: err.message });
      return;
    }
    if (err instanceof InactiveUserError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

// Relee el perfil del usuario autenticado desde la DB, para no confiar en un token viejo
// si fue desactivado o modificado desde que se emitió.
authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) {
    res.status(401).json({ error: "El usuario ya no existe" });
    return;
  }
  res.json(user);
}));

// No hay tabla de tokens revocados (sobre-ingeniería para 3-5 cuentas con token de
// corta duración): el logout real es 100% del lado del cliente, borrando el token
// guardado. Este endpoint existe solo por simetría de API.
authRouter.post("/logout", (_req, res) => {
  res.json({ ok: true });
});
