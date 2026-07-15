import { config, isFudoConfigured } from "../../config.js";
import type { FudoRawProduct, SyncedProduct } from "./types.js";

export class FudoNotConfiguredError extends Error {
  constructor() {
    super("FUDO no está configurado. Completá FUDO_API_URL y FUDO_API_KEY en server/.env");
    this.name = "FudoNotConfiguredError";
  }
}

// TODO: no tenemos todavía la documentación oficial de la API de FUDO.
// Cuando esté disponible, ajustar el endpoint, el esquema de autenticación
// y el mapeo de campos en mapProduct().
async function fetchRawProducts(): Promise<FudoRawProduct[]> {
  if (!isFudoConfigured()) throw new FudoNotConfiguredError();

  const res = await fetch(`${config.fudo.apiUrl}/products`, {
    headers: { Authorization: `Bearer ${config.fudo.apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`FUDO respondió ${res.status}: ${await res.text()}`);
  }

  const data: unknown = await res.json();
  if (Array.isArray(data)) return data as FudoRawProduct[];
  if (data && typeof data === "object" && Array.isArray((data as any).products)) {
    return (data as any).products as FudoRawProduct[];
  }
  return [];
}

function mapProduct(raw: FudoRawProduct): SyncedProduct {
  // TODO: mapear a los nombres de campo reales de FUDO una vez confirmada la doc.
  return {
    externalId: String(raw.id ?? raw.externalId ?? ""),
    name: String(raw.name ?? raw.nombre ?? ""),
    price: Number(raw.price ?? raw.precio ?? 0),
    category: String(raw.category ?? raw.categoria ?? ""),
    active: raw.active !== false,
  };
}

export async function fetchFudoProducts(): Promise<SyncedProduct[]> {
  const raw = await fetchRawProducts();
  return raw.map(mapProduct);
}
