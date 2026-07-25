import { db } from "../db.js";
import type { DailySales, MonthlyReport, OrderSummary, TopProduct } from "./types.js";

export class InvalidMonthError extends Error {
  constructor() {
    super('El mes debe tener el formato "YYYY-MM" (ej: 2026-01)');
    this.name = "InvalidMonthError";
  }
}

// Convierte "YYYY-MM" al rango [primer día del mes, primer día del mes siguiente).
function parseMonthRange(month: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new InvalidMonthError();
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) throw new InvalidMonthError();
  return { start: new Date(year, monthIndex, 1), end: new Date(year, monthIndex + 1, 1) };
}

// Calcula ventas totales, cantidad de pedidos entregados, el top 5 de productos, la serie
// diaria de ventas y el detalle de cada pedido entregado de un mes. Mismos criterios que ya
// usaba AdminDashboard.tsx: las ventas (totalSales, dailySales, orders) solo cuentan pedidos
// "Entregado"; el ranking de productos cuenta cantidad y facturación de todos los pedidos no
// "Cancelado". Se agrupa por createdAt (no por deliveredAt) para que un pedido siempre caiga en
// el mismo mes/día tanto acá como en el total — createdAt es también lo que ya usa el filtro de
// rango de este mismo mes, así que mezclar los dos criterios haría que un pedido "cambie de mes"
// entre el total y el detalle diario si se creó un día y se entregó al siguiente.
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end } = parseMonthRange(month);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  const delivered = orders.filter(o => o.status === "Entregado");
  const totalSales = delivered.reduce((s, o) => s + Number(o.total), 0);
  const orderCount = delivered.length;

  const productStats: Record<string, TopProduct> = {};
  orders
    .filter(o => o.status !== "Cancelado")
    .forEach(o => o.items.forEach(i => {
      const stat = productStats[i.name] ?? { name: i.name, qty: 0, revenue: 0 };
      stat.qty += i.qty;
      stat.revenue += i.qty * Number(i.price);
      productStats[i.name] = stat;
    }));
  const topProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Un total por cada día del mes (incluidos los días sin ventas, en 0) para que el gráfico de
  // línea tenga el eje X completo del 1 al último día del mes, sin huecos.
  const daysInMonth = new Date(end.getTime() - 1).getDate();
  const dailyTotals = new Array(daysInMonth).fill(0);
  delivered.forEach(o => { dailyTotals[o.createdAt.getDate() - 1] += Number(o.total); });
  const dailySales: DailySales[] = dailyTotals.map((total, i) => ({ day: i + 1, total }));

  const orderSummaries: OrderSummary[] = delivered.map(o => ({
    id: o.id,
    orderNumber: String(o.orderNumber).padStart(3, "0"),
    customer: o.customer,
    createdAt: o.createdAt.toISOString(),
    itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    total: Number(o.total),
  }));

  return { month, totalSales, orderCount, topProducts, dailySales, orders: orderSummaries };
}
