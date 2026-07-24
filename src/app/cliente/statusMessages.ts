import type { OrderStatus } from "../types";

// Mensaje explicativo que ve el cliente en el seguimiento de su pedido, según el estado actual.
export const STATUS_MESSAGES: Record<OrderStatus, string> = {
  "Pendiente":          "Tu pedido fue recibido. La cocina te va a confirmar el horario de retiro a la brevedad.",
  "Programado":         "Tu pedido fue confirmado para el horario que elegiste. ¡Pronto comenzarán a prepararlo!",
  "En preparación":     "¡Tu pedido está siendo preparado ahora mismo! En breve estará listo.",
  "Listo para retirar": "¡Tu pedido está listo! Podés pasar a retirarlo cuando quieras.",
  "Entregado":          "El pedido fue entregado correctamente. ¡Gracias por elegirnos!",
  "Cancelado":          "Este pedido fue cancelado. Si tenés alguna consulta, llamanos al 4521-8800.",
};
