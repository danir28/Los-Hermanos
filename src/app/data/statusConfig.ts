import { Clock, Calendar, Flame, CheckCircle, Package, Ban } from "lucide-react";
import type { OrderStatus, StatusCfg } from "../types";

// Configuración visual (color, ícono, etiqueta) por cada estado de pedido, usada por StatusBadge.
export const STATUS: Record<OrderStatus, StatusCfg> = {
  "Pendiente":          { dot: "bg-amber-400",  badge: "bg-amber-50 border-amber-300 text-amber-700",   label: "Pendiente",          Icon: Clock        },
  "Programado":         { dot: "bg-blue-400",   badge: "bg-blue-50 border-blue-300 text-blue-700",      label: "Programado",         Icon: Calendar     },
  "En preparación":     { dot: "bg-orange-400", badge: "bg-orange-50 border-orange-300 text-orange-700",label: "En preparación",     Icon: Flame        },
  "Listo para retirar": { dot: "bg-green-500",  badge: "bg-green-50 border-green-300 text-green-700",   label: "Listo para retirar", Icon: CheckCircle  },
  "Entregado":          { dot: "bg-gray-400",   badge: "bg-gray-50 border-gray-200 text-gray-600",      label: "Entregado",          Icon: Package      },
  "Cancelado":          { dot: "bg-red-400",    badge: "bg-red-50 border-red-300 text-red-700",         label: "Cancelado",          Icon: Ban          },
};
