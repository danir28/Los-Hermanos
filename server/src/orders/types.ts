// Ítem de un pedido tal como lo mandan el frontend o lo devuelve la API.
export type OrderItemInput = { name: string; qty: number; price: number };

// Datos necesarios para crear un pedido nuevo (cliente, recepción, cocina). estimatedTime es el
// turno de retiro elegido en el momento de crear el pedido (ver orders/slots.ts) — opcional: si
// todos los turnos visibles están llenos, recepción/cocina puede cargar el pedido igual sin
// horario (nace "Pendiente", como antes de este cambio) y reprogramarlo después.
export type CreateOrderInput = {
  customer: string;
  phone: string;
  items: OrderItemInput[];
  type: string;
  estimatedTime?: string;
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
