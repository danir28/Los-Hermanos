import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { config } from "../config.js";
import { requireAuth, requireRole } from "./middleware.js";

// Puro: req/res fabricados a mano, sin supertest ni Express real — no toca la DB en ningún
// caso, así que estos tests no necesitan la base de datos de test levantada.
function fakeRes() {
  const res = {} as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeReq(headers: Record<string, string> = {}): Request {
  return { header: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
}

describe("requireAuth", () => {
  it("rechaza sin header de autorización", () => {
    const req = fakeReq();
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rechaza un scheme que no sea Bearer", () => {
    const req = fakeReq({ authorization: "Basic algo" });
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rechaza un token malformado", () => {
    const req = fakeReq({ authorization: "Bearer no-es-un-jwt" });
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rechaza un token firmado con otro secreto", () => {
    const token = jwt.sign({ sub: "1", usuario: "x", rol: "admin" }, "otro-secreto");
    const req = fakeReq({ authorization: `Bearer ${token}` });
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rechaza un token ya expirado", () => {
    const token = jwt.sign({ sub: "1", usuario: "x", rol: "admin" }, config.jwt.secret, { expiresIn: -1 });
    const req = fakeReq({ authorization: `Bearer ${token}` });
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("acepta un token válido y llena req.user con lo que trae el payload", () => {
    const token = jwt.sign({ sub: "user-1", usuario: "recepcion_test", rol: "recepcionista" }, config.jwt.secret);
    const req = fakeReq({ authorization: `Bearer ${token}` });
    const res = fakeRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: "user-1", usuario: "recepcion_test", rol: "recepcionista" });
  });
});

describe("requireRole", () => {
  it("rechaza si req.user no fue llenado (requireAuth no corrió antes)", () => {
    const req = fakeReq();
    const res = fakeRes();
    const next = vi.fn();
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rechaza un rol que no está entre los permitidos", () => {
    const req = fakeReq();
    req.user = { id: "1", usuario: "cocina_test", rol: "cocina" };
    const res = fakeRes();
    const next = vi.fn();
    requireRole("admin", "recepcionista")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deja pasar un rol permitido", () => {
    const req = fakeReq();
    req.user = { id: "1", usuario: "admin_test", rol: "admin" };
    const res = fakeRes();
    const next = vi.fn();
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
