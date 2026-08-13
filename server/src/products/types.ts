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
  // Si no es null, `options` fue calculado dinámicamente a partir del catálogo (ver
  // resolveGroupOptions en service.ts) en vez de venir de filas ProductOption guardadas — el
  // valor es la categoría fuente (ej. "Empanadas"). El admin lo necesita para saber en qué modo
  // mostrar el editor del grupo; el resto de los consumidores (carrito, ProductOptionsModal)
  // pueden ignorarlo y tratar `options` igual sea cual sea el origen.
  sourceCategory: string | null;
  // Precio que aporta cualquier opción dinámica que no tenga su propio override (ver
  // resolveGroupOptions) — irrelevante para un grupo manual, siempre 0 ahí.
  defaultPriceDelta: number;
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
  // Si true, este producto puede aparecer como opción calculada dentro de un ProductOptionGroup
  // de otro producto con sourceCategory = esta category (ver comentario en schema.prisma).
  offerAsOption: boolean;
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
  offerAsOption: boolean;
};

// Edición parcial: PATCH puede mandar solo el campo que cambió (ej. solo "price").
export type UpdateProductInput = Partial<CreateProductInput>;

// Payload para reemplazar el set completo de grupos de opciones de un producto (PUT
// /api/products/:id/option-groups) — ver replaceOptionGroups en service.ts.
//
// sourceProductId: null para una opción de un grupo MANUAL (es una opción tipeada a mano, como
// siempre). Para un grupo DINÁMICO, cada entrada de `options` es en cambio un OVERRIDE de precio
// para un producto puntual de la categoría vinculada — sourceProductId apunta a ese Product, y
// `name` queda solo como referencia legible (no autoritativa, ver ProductOption en
// schema.prisma). Antes de este cambio, un grupo dinámico no podía traer ninguna `options` no
// vacía; ahora sí, pero únicamente en este formato de override.
export type CreateOptionInput = { name: string; priceDelta: number; sortOrder: number; sourceProductId: number | null };
export type CreateOptionGroupInput = {
  name: string;
  selectionType: SelectionType;
  required: boolean;
  quantityTarget: number | null;
  // Categoría fuente si el grupo es dinámico, null si es manual (ver ProductOptionGroupDTO).
  sourceCategory: string | null;
  // Precio de cualquier opción dinámica sin override puntual (ver ProductOption.sourceProductId
  // en schema.prisma) — irrelevante y se guarda en 0 para un grupo manual.
  defaultPriceDelta: number;
  sortOrder: number;
  options: CreateOptionInput[];
};
