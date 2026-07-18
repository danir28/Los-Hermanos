import { useState } from "react";
import { X } from "lucide-react";
import type { Order, OrderStatus } from "../types";
import { formatCurrency } from "../lib/format";
import { CAN_CANCEL } from "../data/statusConfig";
import { StatusBadge, TypePill, ConfirmDialog } from "../components/shared";

// Listado de pedidos de la jornada comercial actual para recepción (el backend ya restringe
// `orders` a hoy para este rol — ver GET /api/orders), con filtro por estado y cancelación.
export function ReceptionistOrders({ orders, onUpdateStatus }: { orders: Order[]; onUpdateStatus: (id: string, status: OrderStatus) => void }) {
  const [filter, setFilter] = useState("Todos");
  // Se guarda el pedido completo (no solo el id) porque el diálogo necesita mostrar el número
  // visible (orderNumber) además de mandar el id real a onUpdateStatus.
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const tabs: { key: string; label: string }[] = [
    { key: "Todos",                label: "Todos"                },
    { key: "Pendiente",            label: "Pendiente"            },
    { key: "Programado",           label: "Programado"           },
    { key: "En preparación",       label: "En preparación"       },
    { key: "Listo para retirar",   label: "Listo para retirar"   },
    { key: "Entregado",            label: "Entregado"            },
    { key: "Cancelado",            label: "Cancelado"            },
  ];
  const filtered = filter === "Todos" ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="font-display text-4xl font-bold mb-6">Lista de Pedidos</h1>
      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(t => {
          const count = t.key === "Todos" ? orders.length : orders.filter(o => o.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${filter === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {t.label}
              <span className={`font-mono ${filter === t.key ? "bg-white/20" : "bg-muted"} px-1.5 py-0.5 rounded-full`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["#", "Cliente", "Teléfono", "Productos", "Total", "Estado", "Horario", "Ingreso", "Canal", "Acciones"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => (
                <tr key={order.id} className={`transition-colors hover:bg-secondary/40 ${order.status === "Cancelado" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-primary">#{order.orderNumber}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{order.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{order.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                    {order.estimatedTime ? `${order.estimatedTime} hs` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{order.createdAt} hs</td>
                  <td className="px-4 py-3"><TypePill type={order.type} /></td>
                  <td className="px-4 py-3">
                    {CAN_CANCEL.includes(order.status) && (
                      <button onClick={() => setCancelTarget(order)}
                        className="flex items-center gap-1 text-xs text-destructive border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors font-medium whitespace-nowrap">
                        <X size={12} /> Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin pedidos en este estado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cancelTarget && (
        <ConfirmDialog
          title="¿Cancelar pedido?"
          description={`Se cancelará el pedido #${cancelTarget.orderNumber}. Esta acción no se puede deshacer.`}
          confirmLabel="Sí, cancelar"
          onCancel={() => setCancelTarget(null)}
          onConfirm={() => { onUpdateStatus(cancelTarget.id, "Cancelado"); setCancelTarget(null); }}
        />
      )}
    </div>
  );
}
