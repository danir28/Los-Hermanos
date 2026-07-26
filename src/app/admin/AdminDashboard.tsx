import { ClipboardList, Flame, TrendingUp, ShoppingBag, Ban } from "lucide-react";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";
import { StatusBadge } from "../components/shared";

// Dashboard administrativo: métricas del día, productos más pedidos y pedidos recientes.
// El backend ya restringe `orders` a la jornada comercial actual para este rol (ver
// GET /api/orders) — a diferencia de Reportes, que sí trabaja sobre el histórico completo.
export function AdminDashboard({ orders }: { orders: Order[] }) {
  const productSales: Record<string, number> = {};
  orders.filter(o => o.status !== "Cancelado").forEach(o => o.items.forEach(i => {
    productSales[i.name] = (productSales[i.name] ?? 0) + i.qty;
  }));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSales = topProducts[0]?.[1] ?? 1;
  const totalRevenue = orders.filter(o => o.status === "Entregado").reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Panel administrativo</p>
      <h1 className="font-display text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pedidos hoy",       value: orders.length,                                             Icon: ClipboardList, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200"    },
          { label: "En preparación",    value: orders.filter(o => o.status === "En preparación").length,  Icon: Flame,         color: "text-orange-600", bg: "bg-orange-50 border-orange-200"},
          { label: "Facturado hoy",     value: formatCurrency(totalRevenue),                              Icon: TrendingUp,    color: "text-green-600",  bg: "bg-green-50 border-green-200"  },
          { label: "Cancelados hoy",    value: orders.filter(o => o.status === "Cancelado").length,       Icon: Ban,           color: "text-red-600",    bg: "bg-red-50 border-red-200"      },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <stat.Icon size={18} className={stat.color} />
            <p className={`font-mono font-bold text-2xl mt-2 mb-1 ${stat.color} leading-none`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Productos más pedidos
          </h2>
          <div className="space-y-4">
            {topProducts.map(([name, qty], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate mb-1">{name}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(qty / maxSales) * 100}%` }} />
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-primary shrink-0">{qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" /> Pedidos recientes
          </h2>
          <div className="divide-y divide-border">
            {orders.slice(0, 6).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-primary font-bold shrink-0">#{order.orderNumber}</span>
                  <span className="text-sm font-medium truncate">{order.customer}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={order.status} />
                  <span className="font-mono text-xs font-bold">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
