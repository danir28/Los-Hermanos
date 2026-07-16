import { Router } from "express";
import { db } from "../../db.js";
import { isFudoConfigured } from "../../config.js";
import { fetchFudoProducts, FudoNotConfiguredError } from "./client.js";

export const fudoRouter = Router();

// Informa si FUDO está configurado y cuándo fue la última sincronización exitosa.
fudoRouter.get("/status", async (_req, res) => {
  const lastSynced = await db.fudoProduct.aggregate({ _max: { updatedAt: true } });
  res.json({ configured: isFudoConfigured(), lastSync: lastSynced._max.updatedAt ?? null });
});

// Trae el catálogo actual de FUDO y hace upsert de cada producto en la tabla FudoProduct.
fudoRouter.post("/sync", async (_req, res) => {
  try {
    const products = await fetchFudoProducts();
    await db.$transaction(
      products.map(p =>
        db.fudoProduct.upsert({
          where: { externalId: p.externalId },
          create: p,
          update: { name: p.name, price: p.price, category: p.category, active: p.active },
        })
      )
    );
    res.json({ synced: products.length, syncedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof FudoNotConfiguredError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(502).json({ error: err instanceof Error ? err.message : "Error desconocido al sincronizar con FUDO" });
  }
});

// Devuelve el último catálogo de FUDO guardado en la DB (snapshot, no en vivo).
fudoRouter.get("/products", async (_req, res) => {
  const products = await db.fudoProduct.findMany({ orderBy: { name: "asc" } });
  res.json(products.map(p => ({ ...p, price: Number(p.price) })));
});
