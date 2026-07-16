import { Clock, CheckCircle, Package, Phone, PlusCircle, Calendar } from "lucide-react";
import type { Order, OrderStatus } from "../types";
import { formatCurrency } from "../lib/format";
import { TypePill } from "../components/shared";

// Dashboard de recepción: métricas rápidas y accesos directos a los pedidos más urgentes.
export function ReceptionistDashboard({ orders, onNavigate, onUpdateStatus }: { orders: Order[]; onNavigate: (v: string) => void; onUpdateStatus: (id: string, status: OrderStatus) => void }) {
  const pending    = orders.filter(o => o.status === "Pendiente");
  const programmed = orders.filter(o => o.status === "Programado");
  const ready      = orders.filter(o => o.status === "Listo para retirar");
  const delivered  = orders.filter(o => o.status === "Entregado");

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Panel de recepción</p>
          <h1 className="font-display text-4xl font-bold">Bienvenida</h1>
          <p className="text-muted-foreground mt-1 text-sm">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={() => onNavigate("create")} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md">
          <PlusCircle size={18} /> Nuevo Pedido
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Pendientes",         value: pending.length,    color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",  Icon: Clock        },
          { label: "Programados",        value: programmed.length, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",    Icon: Calendar     },
          { label: "Listos para retirar",value: ready.length,      color: "text-green-600",  bg: "bg-green-50 border-green-200",  Icon: CheckCircle  },
          { label: "Entregados hoy",     value: delivered.length,  color: "text-gray-500",   bg: "bg-gray-50 border-gray-200",    Icon: Package      },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-5 ${stat.bg}`}>
            <stat.Icon size={22} className={stat.color} />
            <p className={`font-mono font-bold text-4xl mt-3 mb-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full" /> Pedidos Pendientes
      </h2>
      <div className="space-y-2 mb-10">
        {pending.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No hay pedidos pendientes en este momento</p>}
        {pending.map(order => (
          <div key={order.id} className="bg-card border border-amber-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="w-1 self-stretch bg-amber-400 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                <span className="font-semibold text-sm">{order.customer}</span>
                <TypePill type={order.type} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(" · ")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold">{formatCurrency(order.total)}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.createdAt} hs</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full" /> Listos para retirar
      </h2>
      <div className="space-y-2">
        {ready.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No hay pedidos listos en este momento</p>}
        {ready.map(order => (
          <div key={order.id} className="bg-card border border-green-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-1 self-stretch bg-green-500 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                <span className="font-semibold text-sm">{order.customer}</span>
                <Phone size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">{order.phone}</span>
              </div>
              <p className="text-xs text-muted-foreground">{order.items.map(i => `${i.name} ×${i.qty}`).join(" · ")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-green-700">Retiro: {order.estimatedTime} hs</p>
              <button onClick={() => onUpdateStatus(order.id, "Entregado")}
                className="mt-1.5 text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors font-medium">
                ✓ Marcar entregado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
