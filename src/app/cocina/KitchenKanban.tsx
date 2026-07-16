import { Clock } from "lucide-react";
import type { Order, OrderStatus } from "../types";
import { STATUS } from "../data/statusConfig";
import { AgeIndicator } from "./AgeIndicator";
import { KANBAN_COLS, NEXT_STATES } from "./kanbanConfig";

// Tablero kanban de cocina: columnas por estado, con acción para avanzar cada pedido al siguiente
// estado de producción. Cancelar y marcar como entregado son tareas de recepción, no de cocina.
export function KitchenKanban({ orders, onUpdateStatus }: { orders: Order[]; onUpdateStatus: (id: string, s: OrderStatus) => void }) {
  return (
    <div className="px-6 py-8 min-h-[calc(100vh-120px)]">
      <h1 className="font-display text-4xl font-bold mb-2">Tablero de Producción</h1>
      <p className="text-muted-foreground mb-6">Avanzá el estado de los pedidos con los botones de cada tarjeta.</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        {KANBAN_COLS.map(col => {
          const colOrders = orders.filter(o => o.status === col.status);
          return (
            <div key={col.status} className={`rounded-2xl border ${col.border} ${col.bg} p-3`}>
              <div className={`flex items-center justify-between mb-3 ${col.color}`}>
                <span className="font-semibold text-xs leading-tight">{STATUS[col.status].label}</span>
                <span className="font-mono font-bold text-xl">{colOrders.length}</span>
              </div>
              <div className="space-y-2.5">
                {colOrders.map(order => {
                  const nextStatus = NEXT_STATES[order.status];
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono font-bold text-primary">{order.id}</span>
                        <span className="font-mono text-xs text-muted-foreground">{order.createdAt}</span>
                      </div>
                      <p className="font-semibold text-sm mb-1 truncate">{order.customer}</p>
                      <div className="mb-2">
                        <AgeIndicator createdAt={order.createdAt} hasSchedule={!!order.estimatedTime} />
                      </div>
                      <div className="space-y-0.5 mb-3">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">{item.qty}×</span> {item.name}
                          </p>
                        ))}
                      </div>
                      {order.estimatedTime && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock size={10} />{order.estimatedTime} hs
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {nextStatus && (
                          <button onClick={() => onUpdateStatus(order.id, nextStatus)}
                            className="w-full text-xs bg-primary text-primary-foreground py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                            → {STATUS[nextStatus].label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground/50 text-xs border border-dashed border-current/20 rounded-xl">
                    Sin pedidos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

