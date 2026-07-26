// Ítem del carrito de compras del cliente (producto + cantidad elegida).
export type CartItem = { id: number; name: string; price: number; qty: number; image: string };

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
  items: { name: string; qty: number; price: number }[];
  status: OrderStatus; createdAt: string; estimatedTime: string | null;
  total: number; type: OrderType; deliveredAt: string | null;
};

// Producto del catálogo de la rotisería.
export type Product = { id: number; name: string; category: string; price: number; description: string; image: string; featured: boolean; active: boolean; outOfStock: boolean };

// Configuración visual (color, ícono, etiqueta) asociada a cada OrderStatus.
export type StatusCfg = { dot: string; badge: string; label: string; Icon: any };
