import { ChefHat, Clock, Phone, User, RefreshCw } from "lucide-react";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";
import { StatusBadge, TypePill } from "../components/shared";
import { timeAgo } from "./timeAgo";
import { AgeIndicator } from "./AgeIndicator";

// Panel principal de cocina: lista de pedidos activos, ordenados con indicador de urgencia.
export function KitchenPanel({ orders, onGoAssign }: { orders: Order[]; onGoAssign: (id: string) => void }) {
  const active = orders.filter(o => o.status !== "Entregado" && o.status !== "Listo para retirar" && o.status !== "Cancelado");
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-md">
          <ChefHat size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">Panel de Cocina</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} pedido{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""} — {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
          </p>
        </div>
      </div>

      {active.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Sin pedidos activos en este momento</p>
        </div>
      )}

      <div className="space-y-3">
        {active.map(order => {
          const noTime = !order.estimatedTime;
          const { minutes } = timeAgo(order.createdAt);
          const urgentBorder = minutes >= 25 ? "border-red-300 shadow-red-50 shadow-md" : noTime ? "border-amber-300 shadow-amber-50 shadow-md" : "border-border";
          return (
            <div key={order.id} className={`bg-card border rounded-2xl p-5 transition-all ${urgentBorder}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <span className="font-mono font-bold text-primary text-xl">#{order.id}</span>
                    <StatusBadge status={order.status} />
                    <TypePill type={order.type} />
                    {noTime && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-semibold animate-pulse">Sin horario</span>}
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
                  {/* Age indicator row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>Ingresó: <span className="font-mono font-semibold text-foreground">{order.createdAt} hs</span></span>
                    </div>
                    <AgeIndicator createdAt={order.createdAt} />
                  </div>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  <span className="font-mono font-bold text-lg text-foreground">{formatCurrency(order.total)}</span>
                  {order.estimatedTime ? (
                    <>
                      <p className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-xl">
                        Retiro: {order.estimatedTime} hs
                      </p>
                      <button onClick={() => onGoAssign(order.id)}
                        className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-xl transition-colors font-semibold">
                        <RefreshCw size={12} /> Reprogramar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => onGoAssign(order.id)}
                      className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-sm">
                      Asignar horario
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

