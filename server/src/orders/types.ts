// Ítem de un pedido tal como lo mandan el frontend o lo devuelve la API. notes es la
// aclaración libre opcional del cliente/recepción (ej. "sin tomate") — texto plano, sin
// validación contra el catálogo, que cocina lee tal cual.
export type OrderItemInput = { name: string; qty: number; price: number; notes?: string | null };

// Datos necesarios para crear un pedido nuevo (cliente, recepción, cocina). estimatedTime es el
// turno de retiro elegido en el momento de crear el pedido (ver orders/slots.ts) — obligatorio:
// todo pedido nace "Programado" con un horario real. Ya no existe un status "Pendiente" para
// cargar un pedido sin horario (decisión del 26/7/2026: ese camino ya era inalcanzable desde la
// UI, que siempre exige elegir un turno antes de confirmar — ver CustomerCart/ReceptionistCreateOrder).
export type CreateOrderInput = {
  customer: string;
  phone: string;
  items: OrderItemInput[];
  type: string;
  estimatedTime: string;
};

// Cambios posibles sobre un pedido existente: avanzar/cancelar estado, o asignarle horario.
export type UpdateOrderInput = {
  status?: string;
  estimatedTime?: string;
};

// Forma de un pedido tal como la espera el frontend. id es el identificador real (uuid) — lo
// que hay que mandar para actualizar este pedido puntual, nunca se muestra en pantalla.
// orderNumber es el número visible ya formateado ("007"), que se reinicia cada jornada
// comercial y por lo tanto puede repetirse — solo sirve para mostrar, no para identificar.
// createdAt ya viene como hora ("HH:MM"). deliveredAt es un ISO completo (con fecha) porque,
// a diferencia de createdAt, el frontend necesita saber en qué día calendario cayó la
// entrega para poder filtrar "entregados hoy".
export type OrderDTO = {
  id: string;
  orderNumber: string;
  customer: string;
  phone: string;
  items: OrderItemInput[];
  status: string;
  createdAt: string;
  estimatedTime: string | null;
  total: number;
  type: string;
  deliveredAt: string | null;
};
