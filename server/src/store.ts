import type { SyncedProduct } from "./integrations/fudo/types.js";

// Cache en memoria hasta que el proyecto tenga una base de datos real.
// Se pierde al reiniciar el servidor.
let lastFudoSync: { syncedAt: string; products: SyncedProduct[] } | null = null;

export const productStore = {
  save(products: SyncedProduct[]) {
    lastFudoSync = { syncedAt: new Date().toISOString(), products };
    return lastFudoSync;
  },
  get() {
    return lastFudoSync;
  },
};
