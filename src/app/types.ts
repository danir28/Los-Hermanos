// Ítem del carrito de compras del cliente (producto + cantidad elegida). id identifica la LÍNEA
// del carrito, no el producto: para un producto sin opciones es `String(productId)` (mismo
// comportamiento de siempre: agregarlo de nuevo suma cantidad a la misma línea); para un
// producto con optionGroups, cada configuración elegida genera su propio id (ver
// ProductOptionsModal), así dos selecciones distintas del mismo producto conviven como líneas
// separadas. name/price ya vienen resueltos con la selección de opciones incluida (ver
// ProductOptionsModal) — el backend solo guarda ese resultado como foto del pedido, no sabe
// nada de productId ni de opciones. notes es la aclaración libre opcional de esa línea puntual
// (ej. "sin tomate"), editable desde CustomerCart/ReceptionistCreateOrder — no afecta el precio
// ni identifica la línea, es texto plano que cocina lee tal cual.
export type CartItem = { id: string; productId: number; name: string; price: number; qty: number; image: string; notes?: string };

// Largo máximo de CartItem.notes, compartido entre CustomerCart y ReceptionistCreateOrder para
// que el límite (y lo que cocina puede llegar a recibir) sea consistente sin importar el canal.
export const ITEM_NOTES_MAX_LENGTH = 140;

// Estados posibles del ciclo de vida de un pedido. Ya no incluye "Pendiente": todo pedido nace
// "Programado" con un horario de retiro elegido (decisión del 26/7/2026 — ver
// server/src/orders/service.ts#createOrder).
export type OrderStatus = "Programado" | "En preparación" | "Listo para retirar" | "Entregado" | "Cancelado";

// Canal por el que se originó un pedido.
export type OrderType = "online" | "presencial" | "telefónico" | "whatsapp";

// Pedido completo con sus ítems, estado y datos del cliente. id es el identificador real (uuid)
// — se usa para actualizar el pedido (onUpdateStatus, onAssigned, etc.), NUNCA se muestra en
// pantalla. orderNumber es el número visible ("007") — se reinicia cada jornada comercial, así
// que puede repetirse entre días distintos: solo sirve para mostrar, no para identificar un
// pedido. deliveredAt (ISO completo, con fecha) es el momento real en que pasó a "Entregado" —
// no confundir con createdAt, que solo trae la hora ("HH:MM") y es cuándo se creó el pedido.
export type Order = {
  id: string; orderNumber: string; customer: string; phone: string;
  items: { name: string; qty: number; price: number; notes?: string | null }[];
  status: OrderStatus; createdAt: string; estimatedTime: string | null;
  total: number; type: OrderType; deliveredAt: string | null;
};

// Una foto del carrusel de un producto, ordenada por sortOrder (la primera es la miniatura).
export type ProductImage = { id: number; url: string; sortOrder: number };

// Tipo de selección de un grupo de opciones de producto (ver server/src/products/types.ts):
// "single" = radio (una sola opción), "multiple" = checkboxes (0 o más), "quantity" = reparto de
// unidades entre las opciones del grupo, la suma tiene que dar exacto quantityTarget.
export type SelectionType = "single" | "multiple" | "quantity";

export type ProductOption = { id: number; name: string; priceDelta: number; sortOrder: number };

export type ProductOptionGroup = {
  id: number;
  name: string;
  selectionType: SelectionType;
  required: boolean;
  quantityTarget: number | null;
  // Si no es null (ej. "Empanadas"), `options` ya viene calculado por el backend a partir del
  // catálogo (productos activos, con stock y offerAsOption=true de esa categoría) en vez de ser
  // una lista tipeada a mano — ver server/src/products/service.ts#resolveGroupOptions. El carrito
  // y ProductOptionsModal no necesitan tratarlo distinto: `options` ya llega resuelto igual sea
  // cual sea el origen. Solo lo usa AdminProducts para saber en qué modo mostrar el editor.
  sourceCategory: string | null;
  // Precio que ya trae resuelto cualquier opción dinámica sin override puntual (ver
  // options[].priceDelta) — irrelevante en un grupo manual, siempre 0 ahí. Solo lo usa
  // AdminProducts para precargar el campo "Precio por defecto" al editar un grupo dinámico.
  defaultPriceDelta: number;
  sortOrder: number;
  options: ProductOption[];
};

// Producto del catálogo de la rotisería. images reemplaza el viejo campo `image: string` único
// (carrusel de fotos); optionGroups son las variantes configurables (sabor, agregados, etc.) que
// hay que resolver antes de agregarlo al carrito cuando no está vacío — ver ProductOptionsModal.
// offerAsOption: si es true, este producto puede aparecer como opción calculada dentro de un
// ProductOptionGroup de OTRO producto con sourceCategory = esta category (ej. cada sabor de
// empanada individual, para poder aparecer en "Empanadas (docena)"/"(media docena)").
export type Product = { id: number; name: string; category: string; price: number; description: string; images: ProductImage[]; optionGroups: ProductOptionGroup[]; featured: boolean; active: boolean; outOfStock: boolean; offerAsOption: boolean };

// Configuración visual (color, ícono, etiqueta) asociada a cada OrderStatus.
export type StatusCfg = { dot: string; badge: string; label: string; Icon: any };
