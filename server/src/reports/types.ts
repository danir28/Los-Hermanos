// Producto dentro del top de más pedidos de un mes, con cantidad y facturación acumuladas.
export type TopProduct = { name: string; qty: number; revenue: number };

// Reporte de un mes calendario: ventas totales, cantidad de pedidos entregados y top 5 productos.
export type MonthlyReport = {
  month: string;
  totalSales: number;
  orderCount: number;
  topProducts: TopProduct[];
};
