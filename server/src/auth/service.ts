import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { db } from "../db.js";
import type { User as PrismaUser } from "../generated/prisma/client.js";
import type { LoginResult, UserProfile, UserRole } from "./types.js";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos");
    this.name = "InvalidCredentialsError";
  }
}

export class InactiveUserError extends Error {
  constructor() {
    super("El usuario está desactivado");
    this.name = "InactiveUserError";
  }
}

// Quita el passwordHash antes de exponer el usuario fuera de este módulo.
function toProfile(user: PrismaUser): UserProfile {
  return {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    email: user.email,
    rol: user.rol as UserRole,
    activo: user.activo,
  };
}

// Valida usuario/contraseña, exige que el usuario esté activo, y firma un JWT (HS256,
// 8hs por default) con { sub, usuario, rol }. Único lugar del sistema donde se compara
// una contraseña contra su hash.
export async function login(usuario: string, password: string): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { usuario } });
  if (!user) throw new InvalidCredentialsError();

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new InvalidCredentialsError();

  if (!user.activo) throw new InactiveUserError();

  const token = jwt.sign(
    { sub: user.id, usuario: user.usuario, rol: user.rol },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"] }
  );

  return { token, user: toProfile(user) };
}

// Relee el usuario por id desde la DB (usado por GET /me) para no confiar en un token
// viejo si el usuario fue desactivado o modificado después de emitido. Null si ya no existe.
export async function getUserById(id: string): Promise<UserProfile | null> {
  const user = await db.user.findUnique({ where: { id } });
  return user ? toProfile(user) : null;
}
