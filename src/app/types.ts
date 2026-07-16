// Ítem del carrito de compras del cliente (producto + cantidad elegida).
export type CartItem = { id: number; name: string; price: number; qty: number; image: string };

// Estados posibles del ciclo de vida de un pedido.
export type OrderStatus = "Pendiente" | "Programado" | "En preparación" | "Listo para retirar" | "Entregado" | "Cancelado";

// Canal por el que se originó un pedido.
export type OrderType = "online" | "presencial" | "telefónico" | "whatsapp";

// Pedido completo con sus ítems, estado y datos del cliente.
export type Order = {
  id: string; customer: string; phone: string;
  items: { name: string; qty: number; price: number }[];
  status: OrderStatus; createdAt: string; estimatedTime: string | null;
  total: number; type: OrderType;
};

// Producto del catálogo de la rotisería.
export type Product = { id: number; name: string; category: string; price: number; description: string; image: string; featured: boolean; active: boolean; outOfStock: boolean };

// Configuración visual (color, ícono, etiqueta) asociada a cada OrderStatus.
export type StatusCfg = { dot: string; badge: string; label: string; Icon: any };
