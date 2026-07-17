// Ítem de un pedido tal como lo mandan el frontend o lo devuelve la API.
export type OrderItemInput = { name: string; qty: number; price: number };

// Datos necesarios para crear un pedido nuevo (cliente, recepción).
export type CreateOrderInput = {
  customer: string;
  phone: string;
  items: OrderItemInput[];
  type: string;
};

// Cambios posibles sobre un pedido existente: avanzar/cancelar estado, o asignarle horario.
export type UpdateOrderInput = {
  status?: string;
  estimatedTime?: string;
};

// Forma de un pedido tal como la espera el frontend: id ya formateado ("001") y
// createdAt ya como hora ("HH:MM"), igual que hoy vive en memoria en App.tsx.
export type OrderDTO = {
  id: string;
  customer: string;
  phone: string;
  items: OrderItemInput[];
  status: string;
  createdAt: string;
  estimatedTime: string | null;
  total: number;
  type: string;
};
