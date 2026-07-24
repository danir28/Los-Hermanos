import { Clock, CheckCircle } from "lucide-react";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";
import { formatTimeLabel } from "../lib/time";
import { StatusBadge } from "../components/shared";

// Pantalla de confirmación tras crear un pedido, con resumen y acceso al seguimiento. Recibe el
// pedido completo tal cual lo devolvió ordersCreate — el cliente ya no tiene un array de todos
// los pedidos para buscar adentro (GET /api/orders pasó a ser solo-staff).
export function CustomerConfirmation({ order, onTrack }: { order: Order; onTrack: () => void }) {
  return (
    <div className="max-w-lg mx-auto px-6 py-14 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
        <CheckCircle size={38} className="text-green-600" />
      </div>
      <h1 className="font-display text-4xl font-bold mb-2">¡Pedido recibido!</h1>
      <p className="text-muted-foreground mb-8">
        {order.estimatedTime ? "Tu pedido fue confirmado para el horario que elegiste." : "Tu pedido fue registrado y está siendo revisado por la cocina."}
      </p>
      <div className="bg-card border border-border rounded-2xl p-6 text-left mb-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <span className="text-sm text-muted-foreground">Número de pedido</span>
          <span className="font-mono font-bold text-2xl text-primary">#{order.orderNumber}</span>
        </div>
        <div className="mb-4"><StatusBadge status={order.status} /></div>
        <div className="space-y-1.5 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
              <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
            <span>Total</span>
            <span className="font-mono text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-3 leading-relaxed">
          <Clock size={16} className="shrink-0 mt-0.5 text-amber-600" />
          {order.estimatedTime
            ? <span>Retiro confirmado para las {formatTimeLabel(order.estimatedTime)}. Podés seguir el estado de tu pedido en cualquier momento.</span>
            : <span>La cocina te va a confirmar el horario de retiro a la brevedad. Podés seguir el estado de tu pedido en cualquier momento.</span>}
        </div>
      </div>
      <button onClick={onTrack} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-lg">
        Seguir estado del pedido
      </button>
    </div>
  );
}
