// Producto dentro del top de más pedidos de un mes, con cantidad y facturación acumuladas.
export type TopProduct = { name: string; qty: number; revenue: number };

// Ventas entregadas de un día puntual del mes (day: 1-31) — la suma de todos los "total" da
// exactamente MonthlyReport.totalSales, para que el gráfico y el número grande nunca desacuerden.
export type DailySales = { day: number; total: number };

// Un pedido entregado del mes, para la tabla de detalle — no trae el desglose de items (eso ya
// se agrega aparte en topProducts), solo lo necesario para identificar y auditar el pedido.
export type OrderSummary = { id: string; orderNumber: string; customer: string; createdAt: string; itemCount: number; total: number };

// Reporte de un mes calendario: ventas totales, cantidad de pedidos entregados, top 5 productos,
// serie diaria de ventas (para graficar) y el detalle de cada pedido entregado (para auditar).
export type MonthlyReport = {
  month: string;
  totalSales: number;
  orderCount: number;
  topProducts: TopProduct[];
  dailySales: DailySales[];
  orders: OrderSummary[];
};
