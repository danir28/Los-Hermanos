// Tipo de selección de un ProductOptionGroup — validado acá en TS, no como enum de Prisma
// (misma convención que Order.status/Order.type). "single": radio, una sola opción obligatoria
// si el grupo es required. "multiple": checkboxes, cero o más. "quantity": reparto de unidades
// entre las opciones del grupo, la suma tiene que dar exacto quantityTarget (ej. 12 empanadas
// repartidas entre sabores).
export const SELECTION_TYPES = ["single", "multiple", "quantity"] as const;
export type SelectionType = (typeof SELECTION_TYPES)[number];

export function isSelectionType(value: unknown): value is SelectionType {
  return typeof value === "string" && (SELECTION_TYPES as readonly string[]).includes(value);
}

export type ProductImageDTO = { id: number; url: string; sortOrder: number };

export type ProductOptionDTO = { id: number; name: string; priceDelta: number; sortOrder: number };

export type ProductOptionGroupDTO = {
  id: number;
  name: string;
  selectionType: SelectionType;
  required: boolean;
  quantityTarget: number | null;
  sortOrder: number;
  options: ProductOptionDTO[];
};

// Producto tal como lo espera/devuelve el frontend. images/optionGroups reemplazan el campo
// `image: string` original (ver migración add_product_images) — se administran por endpoints
// propios (POST/DELETE/reorder de imágenes, PUT de option-groups), no por este DTO directamente.
export type ProductDTO = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  images: ProductImageDTO[];
  optionGroups: ProductOptionGroupDTO[];
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
};

// Datos para crear un producto — ya no incluye `image`: un producto nace sin fotos y se le
// suben después de creado (necesita su id para asociarlas).
export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  description: string;
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
};

// Edición parcial: PATCH puede mandar solo el campo que cambió (ej. solo "price").
export type UpdateProductInput = Partial<CreateProductInput>;

// Payload para reemplazar el set completo de grupos de opciones de un producto (PUT
// /api/products/:id/option-groups) — ver replaceOptionGroups en service.ts.
export type CreateOptionInput = { name: string; priceDelta: number; sortOrder: number };
export type CreateOptionGroupInput = {
  name: string;
  selectionType: SelectionType;
  required: boolean;
  quantityTarget: number | null;
  sortOrder: number;
  options: CreateOptionInput[];
};
