import type { CartItem, Product } from "../types";

// Línea de descuento a mostrar en el resumen del carrito y a mandar como un ítem más del pedido
// (mismo shape mínimo que espera el backend: name/qty/price, ver CreateOrderInput en
// server/src/orders/types.ts) — no es un CartItem real: no tiene productId ni id de línea, no se
// edita con +/- ni se le puede cargar una aclaración, solo se calcula y se muestra/envía.
export type DiscountLine = { name: string; qty: number; price: number };

// Una "regla de paquete" derivada del catálogo: cualquier producto que tenga un grupo de
// opciones "quantity" vinculado a categoría (ver ProductOptionGroup.sourceCategory en
// server/prisma/schema.prisma) define, con su propio precio, cuánto sale comprar `size` unidades
// sueltas de esa categoría como paquete — sin que haga falta tocar el producto contenedor en sí
// para que la regla exista. Ej: "Empanadas Media Docena" ($10000, quantityTarget=6) define
// { category: "Empanadas", size: 6, price: 10000 }.
type BundleRule = { category: string; size: number; price: number };

// Junta las reglas de paquete de todo el catálogo — genérico a propósito (decisión del dueño del
// proyecto, 12/8/2026): agregar una categoría nueva con paquete propio no requiere tocar este
// archivo, alcanza con cargar el producto-paquete en AdminProducts (grupo "quantity" vinculado a
// esa categoría).
function deriveBundleRules(products: Product[]): BundleRule[] {
  const rules: BundleRule[] = [];
  for (const p of products) {
    for (const g of p.optionGroups) {
      if (g.selectionType === "quantity" && g.sourceCategory && g.quantityTarget) {
        rules.push({ category: g.sourceCategory, size: g.quantityTarget, price: p.price });
      }
    }
  }
  return rules;
}

// Busca la forma más barata de cubrir `count` unidades combinando paquetes (0 o más, de
// cualquier tamaño disponible) más el resto suelto a `unitPrice` cada uno — decisión explícita
// del dueño del proyecto, revierte una decisión anterior que solo daba el descuento en múltiplos
// exactos: la clienta real confirmó que el criterio correcto es "el paquete más grande que entra
// completo, y el resto por unidad" (ej. 7 empanadas = media docena + 1 suelta = 12000; 13 = docena
// + 1 suelta = 22000). Es el problema clásico de la mochila ilimitada (unbounded knapsack/coin
// change) resuelto por programación dinámica, con la unidad suelta como "moneda" de último
// recurso siempre disponible: best[n] = costo mínimo de cubrir n unidades, nunca queda sin
// resolver porque como mínimo siempre está la opción de venderlas todas sueltas.
// unitPrice es el precio promedio de las unidades elegibles (realCost/count) — con los precios
// actuales del catálogo (todos los sabores de una misma categoría cuestan igual) esto coincide
// exacto con el precio real de cada una; si en el futuro conviven sabores a precios distintos
// dentro de la misma categoría, esto queda como una aproximación razonable, no como el óptimo
// exacto de qué unidades puntuales dejar sueltas.
function cheapestPackagingCost(count: number, unitPrice: number, sizes: BundleRule[]): number {
  const best: number[] = new Array(count + 1).fill(0);
  for (let n = 1; n <= count; n++) {
    best[n] = best[n - 1] + unitPrice;
    for (const rule of sizes) {
      if (rule.size <= n) best[n] = Math.min(best[n], best[n - rule.size] + rule.price);
    }
  }
  return best[count];
}

// Calcula los descuentos por paquete que corresponden al carrito actual — usada tanto por
// CustomerCart (checkout online) como por ReceptionistCreateOrder (carga manual de recepción y
// cocina), para que la misma regla de negocio no quede duplicada en dos archivos.
//
// Para cada categoría con al menos una regla de paquete, suma las unidades "sueltas" presentes
// en el carrito: líneas cuyo producto pertenece a esa categoría Y cuyo precio coincide con el
// precio de catálogo del producto (así no se cuentan ni líneas ya personalizadas con opciones,
// que tienen otro precio, ni el propio producto-paquete si se agregó como línea directa — su
// precio, el de la docena/media docena entera, no coincide con el de ningún sabor individual).
// Arma una línea de descuento con la diferencia entre lo que costarían sueltas y lo que sale
// cubrirlas con la mejor combinación de paquetes + resto suelto (ver cheapestPackagingCost).
// Devuelve siempre un array (vacío si no aplica ningún descuento, ej. 1 sola unidad), nunca null
// — así el total del carrito puede sumarlo directo sin chequear casos especiales.
export function computeBundleDiscounts(cart: CartItem[], products: Product[]): DiscountLine[] {
  const rules = deriveBundleRules(products);
  if (rules.length === 0) return [];

  const rulesByCategory = new Map<string, BundleRule[]>();
  for (const rule of rules) {
    const list = rulesByCategory.get(rule.category) ?? [];
    list.push(rule);
    rulesByCategory.set(rule.category, list);
  }

  const productsById = new Map(products.map(p => [p.id, p]));
  const discounts: DiscountLine[] = [];

  for (const [category, sizes] of rulesByCategory) {
    const eligible = cart.filter(item => {
      const product = productsById.get(item.productId);
      return product?.category === category && item.price === product.price;
    });
    const count = eligible.reduce((s, i) => s + i.qty, 0);
    if (count === 0) continue;

    const realCost = eligible.reduce((s, i) => s + i.price * i.qty, 0);
    const bundleCost = cheapestPackagingCost(count, realCost / count, sizes);

    const discount = realCost - bundleCost;
    if (discount > 0) {
      discounts.push({ name: `Descuento paquete ${category.toLowerCase()}`, qty: 1, price: -discount });
    }
  }

  return discounts;
}
