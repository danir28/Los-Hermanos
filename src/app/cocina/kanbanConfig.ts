import type { OrderStatus } from "../types";

// Columnas del tablero kanban de cocina, con su color y estado asociado.
export const KANBAN_COLS: { status: OrderStatus; color: string; bg: string; border: string }[] = [
  { status: "Pendiente",          color: "text-amber-700",  bg: "bg-amber-50/80",  border: "border-amber-200"  },
  { status: "Programado",         color: "text-blue-700",   bg: "bg-blue-50/80",   border: "border-blue-200"   },
  { status: "En preparación",     color: "text-orange-700", bg: "bg-orange-50/80", border: "border-orange-200" },
  { status: "Listo para retirar", color: "text-green-700",  bg: "bg-green-50/80",  border: "border-green-200"  },
  { status: "Cancelado",          color: "text-red-700",    bg: "bg-red-50/70",    border: "border-red-200"    },
];

// Próximo estado válido al que puede avanzar un pedido desde cada estado.
export const NEXT_STATES: Partial<Record<OrderStatus, OrderStatus>> = {
  "Pendiente":          "Programado",
  "Programado":         "En preparación",
  "En preparación":     "Listo para retirar",
  "Listo para retirar": "Entregado",
};

// Estados desde los que todavía se puede cancelar un pedido.
export const CAN_CANCEL: OrderStatus[] = ["Pendiente", "Programado"];
