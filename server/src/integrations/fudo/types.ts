// FUDO todavía no tiene documentación de API cargada en este proyecto.
// Estos tipos son provisorios: ajustarlos apenas tengamos acceso a la
// documentación real (nombres de campo, formato de precios, paginación, etc).

export type FudoRawProduct = Record<string, unknown>;

export type SyncedProduct = {
  externalId: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
};
