import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../db.js";
import type { Prisma, Product, ProductImage, ProductOption, ProductOptionGroup } from "../generated/prisma/client.js";
import { UPLOADS_DIR } from "./uploads.js";
import type {
  CreateOptionGroupInput,
  CreateProductInput,
  ProductDTO,
  ProductImageDTO,
  ProductOptionGroupDTO,
  SelectionType,
  UpdateProductInput,
} from "./types.js";

export class ProductNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe el producto #${id}`);
    this.name = "ProductNotFoundError";
  }
}

export class ProductImageNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe la imagen #${id}`);
    this.name = "ProductImageNotFoundError";
  }
}

type ProductWithRelations = Product & {
  images: ProductImage[];
  optionGroups: (ProductOptionGroup & { options: ProductOption[] })[];
};

const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: "asc" } },
  optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
} satisfies Prisma.ProductInclude;

function toDTO(product: ProductWithRelations): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    images: product.images.map((img): ProductImageDTO => ({ id: img.id, url: img.url, sortOrder: img.sortOrder })),
    optionGroups: product.optionGroups.map((group): ProductOptionGroupDTO => ({
      id: group.id,
      name: group.name,
      selectionType: group.selectionType as SelectionType,
      required: group.required,
      quantityTarget: group.quantityTarget,
      sortOrder: group.sortOrder,
      options: group.options.map(opt => ({ id: opt.id, name: opt.name, priceDelta: Number(opt.priceDelta), sortOrder: opt.sortOrder })),
    })),
    featured: product.featured,
    active: product.active,
    outOfStock: product.outOfStock,
  };
}

// Todo el catálogo, ordenado por id (= orden de carga original) — tanto la app de cliente como
// recepción/cocina filtran active/outOfStock del lado del frontend, igual que ya hacían con el
// array hardcodeado; admin necesita ver también los inactivos para poder reactivarlos. El orden
// por id hace que las categorías, al derivarse en el frontend por primera aparición (ver
// src/app/lib/useProducts.ts), conserven el agrupamiento curado con el que se cargó el catálogo
// real la primera vez.
export async function listProducts(): Promise<ProductDTO[]> {
  const products = await db.product.findMany({ orderBy: { id: "asc" }, include: PRODUCT_INCLUDE });
  return products.map(toDTO);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDTO> {
  const product = await db.product.create({ data: input, include: PRODUCT_INCLUDE });
  return toDTO(product);
}

export async function updateProduct(id: number, patch: UpdateProductInput): Promise<ProductDTO> {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) throw new ProductNotFoundError(id);
  const product = await db.product.update({ where: { id }, data: patch, include: PRODUCT_INCLUDE });
  return toDTO(product);
}

// Borrado real (no soft-delete): OrderItem guarda name/qty/price como una foto del momento de
// la compra, independiente del Product — borrar un producto de acá no rompe pedidos ya hechos.
// Para discontinuar un producto sin perder el historial de referencia, usar
// updateProduct(id, { active: false }) en vez de esto.
export async function deleteProduct(id: number): Promise<void> {
  const existing = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (!existing) throw new ProductNotFoundError(id);
  await db.product.delete({ where: { id } });
  await Promise.all(existing.images.map(img => deleteImageFile(img.url)));
}

// Borra el archivo físico de una foto de producto (best-effort: si ya no está en disco por
// algún motivo, no hace falta que falle la operación de borrado en la base).
async function deleteImageFile(url: string): Promise<void> {
  const filename = path.basename(url);
  await fs.unlink(path.join(UPLOADS_DIR, filename)).catch(() => undefined);
}

// Agrega una foto nueva al final del carrusel del producto (sortOrder = cantidad actual de
// fotos, así siempre queda última) y devuelve el producto ya actualizado.
export async function addProductImage(productId: number, url: string): Promise<ProductDTO> {
  const existing = await db.product.findUnique({ where: { id: productId }, include: { images: true } });
  if (!existing) throw new ProductNotFoundError(productId);
  await db.productImage.create({ data: { productId, url, sortOrder: existing.images.length } });
  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, include: PRODUCT_INCLUDE });
  return toDTO(product);
}

export async function deleteProductImage(productId: number, imageId: number): Promise<ProductDTO> {
  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) throw new ProductImageNotFoundError(imageId);
  await db.productImage.delete({ where: { id: imageId } });
  await deleteImageFile(image.url);
  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, include: PRODUCT_INCLUDE });
  return toDTO(product);
}

// Reordena el carrusel de fotos de un producto: orderedIds trae TODOS los ids de imagen del
// producto en el orden final deseado (viene armado por drag/mover del admin).
export async function reorderProductImages(productId: number, orderedIds: number[]): Promise<ProductDTO> {
  const existing = await db.productImage.findMany({ where: { productId } });
  const existingIds = new Set(existing.map(img => img.id));
  if (orderedIds.length !== existing.length || !orderedIds.every(id => existingIds.has(id))) {
    throw new Error("La lista de orden no coincide con las fotos actuales del producto");
  }
  await db.$transaction(orderedIds.map((id, sortOrder) => db.productImage.update({ where: { id }, data: { sortOrder } })));
  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, include: PRODUCT_INCLUDE });
  return toDTO(product);
}

// Reemplaza el set completo de grupos de opciones de un producto (borra los grupos existentes —
// cascade se lleva sus opciones — y crea los nuevos) dentro de una transacción. Mismo patrón de
// "reemplazo completo" que ya usa BusinessHours/SlotWindow con su PUT semanal: para un dato que
// edita el admin ocasionalmente, es más simple y más difícil de romper que diffear grupo por
// grupo.
export async function replaceOptionGroups(productId: number, groups: CreateOptionGroupInput[]): Promise<ProductDTO> {
  const existing = await db.product.findUnique({ where: { id: productId } });
  if (!existing) throw new ProductNotFoundError(productId);

  await db.$transaction(async tx => {
    await tx.productOptionGroup.deleteMany({ where: { productId } });
    for (const group of groups) {
      await tx.productOptionGroup.create({
        data: {
          productId,
          name: group.name,
          selectionType: group.selectionType,
          required: group.required,
          quantityTarget: group.quantityTarget,
          sortOrder: group.sortOrder,
          options: { create: group.options },
        },
      });
    }
  });

  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, include: PRODUCT_INCLUDE });
  return toDTO(product);
}
