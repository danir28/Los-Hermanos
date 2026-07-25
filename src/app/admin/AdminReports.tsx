import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../lib/format";
import { api, type MonthlyReport } from "../lib/api";
import { useAuth } from "../auth";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../components/ui/chart";

// Formatea un Date a "YYYY-MM", el formato que usan el input de mes y el backend.
function toMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Nombre legible de un mes a partir de su valor "YYYY-MM" (ej: "julio 2026").
function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// Fecha/hora de un pedido para la tabla de detalle, siempre 24hs.
function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

const today = new Date();
const thisMonth = toMonthValue(today);
const lastMonth = toMonthValue(new Date(today.getFullYear(), today.getMonth() - 1, 1));

// Colores del gráfico de comparación: los mismos tokens --chart-1/--chart-2 que ya trae
// theme.css (con variantes light/dark), para no inventar colores nuevos fuera del sistema de diseño.
const COMPARE_CHART_CONFIG: ChartConfig = {
  mesA: { label: "Mes A", color: "var(--color-chart-1)" },
  mesB: { label: "Mes B", color: "var(--color-chart-2)" },
};

// Hook chico para pedir el reporte de un mes y quedarse con el resultado (o null mientras carga
// o si falla) — lo usan tanto la comparación (dos meses a la vez) como el detalle (uno solo).
function useMonthlyReport(month: string): MonthlyReport | null {
  const { token } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  useEffect(() => {
    if (!token) return;
    setReport(null);
    api.reportsMonthly(token, month).then(setReport).catch(() => setReport(null));
  }, [token, month]);
  return report;
}

// Pantalla de reportes: gráfico de línea comparando dos meses día por día, más el detalle
// completo (ventas, top productos y cada pedido entregado) de un mes elegido aparte.
export function AdminReports() {
  const [monthA, setMonthA] = useState(thisMonth);
  const [monthB, setMonthB] = useState(lastMonth);
  const reportA = useMonthlyReport(monthA);
  const reportB = useMonthlyReport(monthB);

  const [detailMonth, setDetailMonth] = useState(thisMonth);
  const detailReport = useMonthlyReport(detailMonth);

  // Une las series diarias de ambos meses en un solo array por día (1..máximo de días entre los
  // dos meses), para que recharts dibuje las dos líneas sobre el mismo eje X.
  const maxDays = Math.max(reportA?.dailySales.length ?? 0, reportB?.dailySales.length ?? 0);
  const chartData = Array.from({ length: maxDays }, (_, i) => ({
    day: i + 1,
    mesA: reportA?.dailySales[i]?.total ?? null,
    mesB: reportB?.dailySales[i]?.total ?? null,
  }));

  const maxTopQty = detailReport?.topProducts[0]?.qty ?? 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Panel administrativo</p>
      <h1 className="font-display text-4xl font-bold mb-8">Reportes</h1>

      {/* Comparación de dos meses, día por día */}
      <section className="mb-12">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h2 className="font-semibold text-lg">Comparar dos meses</h2>
          <div className="flex gap-2">
            <input type="month" value={monthA} onChange={e => setMonthA(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm font-semibold" />
            <input type="month" value={monthB} onChange={e => setMonthB(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm font-semibold" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-5">
          <span className="flex items-center gap-1.5 capitalize"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-chart-1)" }} />{monthLabel(monthA)}: <strong className="font-mono">{reportA ? formatCurrency(reportA.totalSales) : "…"}</strong></span>
          <span className="flex items-center gap-1.5 capitalize"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-chart-2)" }} />{monthLabel(monthB)}: <strong className="font-mono">{reportB ? formatCurrency(reportB.totalSales) : "…"}</strong></span>
        </div>
        <ChartContainer config={COMPARE_CHART_CONFIG} className="h-72 w-full">
          <LineChart data={chartData} margin={{ left: 4, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={v => formatCurrency(v)} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={d => `Día ${d}`} />} />
            <Line dataKey="mesA" type="monotone" stroke="var(--color-mesA)" strokeWidth={2} dot={false} connectNulls />
            <Line dataKey="mesB" type="monotone" stroke="var(--color-mesB)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
          </LineChart>
        </ChartContainer>
      </section>

      {/* Detalle de un mes elegido */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="font-semibold text-lg">Detalle de un mes</h2>
          <input type="month" value={detailMonth} onChange={e => setDetailMonth(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm font-semibold" />
        </div>

        {!detailReport ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-display font-bold text-2xl text-primary">{formatCurrency(detailReport.totalSales)}</p>
                <p className="text-xs text-muted-foreground">Ventas (entregados)</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-display font-bold text-2xl">{detailReport.orderCount}</p>
                <p className="text-xs text-muted-foreground">Pedidos entregados</p>
              </div>
            </div>

            {detailReport.topProducts.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top 5 productos</p>
                <div className="space-y-3">
                  {detailReport.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate mb-1">{p.name}</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(p.qty / maxTopQty) * 100}%` }} />
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sm text-primary shrink-0">{p.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Pedidos entregados ({detailReport.orders.length})
            </p>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2.5">N°</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Ítems</th>
                    <th className="px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detailReport.orders.map(o => (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5 font-mono text-primary font-semibold">#{o.orderNumber}</td>
                      <td className="px-4 py-2.5 font-medium">{o.customer}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{formatOrderDate(o.createdAt)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.itemCount}</td>
                      <td className="px-4 py-2.5 font-mono font-semibold">{formatCurrency(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailReport.orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Sin pedidos entregados este mes.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
