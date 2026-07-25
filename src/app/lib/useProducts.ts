import { useEffect, useState } from "react";
import type { Product } from "../types";
import { api } from "./api";

// Devuelve un array sin duplicados con el orden de PRIMERA aparición de cada valor — usada para
// derivar las categorías del catálogo a partir del orden real de los productos (ver
// listProducts en server/src/products/service.ts, que los devuelve ordenados por id = orden de
// carga), en vez de mantener una lista de categorías aparte que se podría desincronizar del
// catálogo real.
function uniqueInOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// Catálogo de productos, compartido por toda la app de cliente y la carga manual de staff —
// reemplaza el `import { PRODUCTS, CATEGORIES } from "../data/products"` que usaban antes de
// que el catálogo viviera en la base. `categories` siempre arranca con "Todos" (mismo criterio
// que ya usaban CustomerMenu/ReceptionistCreateOrder para comparar contra ese literal).
// `refresh` la usa AdminProducts después de crear/editar/borrar un producto, para reflejar el
// resultado real que devuelve el backend en vez de asumir el cambio del lado del cliente.
export function useProducts(): { products: Product[]; categories: string[]; loading: boolean; refresh: () => void } {
  const [products, setProducts] = useState<Product[] | null>(null);

  const refresh = () => { api.productsList().then(setProducts).catch(() => setProducts([])); };
  useEffect(refresh, []);

  const categories = ["Todos", ...uniqueInOrder((products ?? []).map(p => p.category))];

  return { products: products ?? [], categories, loading: products === null, refresh };
}
