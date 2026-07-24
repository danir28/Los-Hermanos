import { ChefHat, Clock, Phone, Printer, User } from "lucide-react";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";
import { StatusBadge, TypePill } from "../components/shared";
import { formatTimeLabel, nowLabel } from "../lib/time";
import { AgeIndicator } from "./AgeIndicator";

// Panel principal de cocina: TODOS los pedidos de la jornada comercial actual, ordenados por
// horario de retiro (los que no tienen horario todavía van primero, marcados para que alguien
// los reprograme). Reemplaza el viejo Panel (que solo mostraba pedidos sin horario, pensado
// para una época en la que cocina asignaba el horario después de creado el pedido) — desde que
// el horario se elige al crear el pedido y los estados avanzan solos según el reloj (ver
// advanceScheduledOrders en el backend), lo que cocina necesita de un vistazo es "qué viene y
// en qué orden", no una cola de trabajo pendiente de asignar.
//
// onPrint solo se ofrece para pedidos "online": los cargados a mano (presencial/telefónico) ya
// imprimen su comanda automáticamente al crearse (ver createManualOrder en AppStaff.tsx) —
// un pedido online nunca pasa por esa pantalla, así que es el único caso donde cocina necesita
// disparar la impresión ella misma, al verlo entrar acá.
export function KitchenPanel({ orders, onGoAssign, onPrint }: { orders: Order[]; onGoAssign: (id: string) => void; onPrint: (order: Order) => void }) {
  // Sin horario primero (necesitan atención humana), después ascendente por horario de retiro
  // — si a las 19:20 hay un pedido y a las 19:30 otro, el de 19:20 aparece arriba.
  const sorted = [...orders].sort((a, b) => {
    if (!a.estimatedTime && !b.estimatedTime) return 0;
    if (!a.estimatedTime) return -1;
    if (!b.estimatedTime) return 1;
    return a.estimatedTime.localeCompare(b.estimatedTime);
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-md">
          <ChefHat size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">Panel de Cocina</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sorted.length} pedido{sorted.length !== 1 ? "s" : ""} hoy — {nowLabel()} hs
          </p>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Todavía no hay pedidos hoy</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(order => {
          const closed = order.status === "Entregado" || order.status === "Cancelado";
          return (
            <div key={order.id} className={`bg-card border rounded-2xl p-5 transition-all ${closed ? "border-border opacity-60" : "border-border"}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <span className="font-mono font-bold text-primary text-xl">#{order.orderNumber}</span>
                    <StatusBadge status={order.status} />
                    <TypePill type={order.type} />
                    {!order.estimatedTime && (
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-semibold animate-pulse">Sin horario</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <User size={13} className="text-muted-foreground" />
                    <span className="font-semibold">{order.customer}</span>
                    <Phone size={13} className="text-muted-foreground ml-1" />
                    <span className="text-muted-foreground font-mono text-xs">{order.phone}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.items.map((item, j) => (
                      <span key={j} className="bg-secondary border border-border text-sm px-3 py-1 rounded-full">
                        <span className="font-mono font-bold text-primary">{item.qty}×</span> {item.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {order.estimatedTime ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>Retiro: <span className="font-mono font-semibold text-foreground">{formatTimeLabel(order.estimatedTime)}</span></span>
                      </div>
                    ) : (
                      <AgeIndicator createdAt={order.createdAt} hasSchedule={false} />
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  <span className="font-mono font-bold text-lg text-foreground">{formatCurrency(order.total)}</span>
                  {order.type === "online" && (
                    <button onClick={() => onPrint(order)}
                      className="text-xs bg-card border border-border px-4 py-2 rounded-xl hover:border-primary/40 transition-colors font-semibold shadow-sm flex items-center gap-1.5">
                      <Printer size={13} /> Imprimir ticket
                    </button>
                  )}
                  {!closed && (
                    <button onClick={() => onGoAssign(order.id)}
                      className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-sm">
                      {order.estimatedTime ? "Reprogramar" : "Asignar horario"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
