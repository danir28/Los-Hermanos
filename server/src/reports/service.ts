import { db } from "../db.js";
import type { MonthlyReport, TopProduct } from "./types.js";

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

// Calcula ventas totales, cantidad de pedidos entregados y el top 5 de productos de un mes.
// Mismos criterios que ya usa AdminDashboard.tsx: las ventas solo cuentan pedidos "Entregado";
// el ranking de productos cuenta cantidad y facturación de todos los pedidos no "Cancelado".
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end } = parseMonthRange(month);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: true },
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

  return { month, totalSales, orderCount, topProducts };
}
