import { Router } from "express";
import { isFudoConfigured } from "../../config.js";
import { productStore } from "../../store.js";
import { fetchFudoProducts, FudoNotConfiguredError } from "./client.js";

export const fudoRouter = Router();

fudoRouter.get("/status", (_req, res) => {
  res.json({ configured: isFudoConfigured(), lastSync: productStore.get()?.syncedAt ?? null });
});

fudoRouter.post("/sync", async (_req, res) => {
  try {
    const products = await fetchFudoProducts();
    const saved = productStore.save(products);
    res.json({ synced: products.length, syncedAt: saved.syncedAt });
  } catch (err) {
    if (err instanceof FudoNotConfiguredError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(502).json({ error: err instanceof Error ? err.message : "Error desconocido al sincronizar con FUDO" });
  }
});

fudoRouter.get("/products", (_req, res) => {
  res.json(productStore.get() ?? { syncedAt: null, products: [] });
});
