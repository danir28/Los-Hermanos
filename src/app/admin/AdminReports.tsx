import { useEffect, useState } from "react";
import { formatCurrency } from "../lib/format";
import { api, type MonthlyReport } from "../lib/api";
import { useAuth } from "../auth";

// Formatea un Date a "YYYY-MM", el formato que usan el input de mes y el backend.
function toMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Nombre legible de un mes a partir de su valor "YYYY-MM" (ej: "julio 2026").
function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

const today = new Date();
const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

// Tarjeta con el reporte de un mes elegible: ventas totales, pedidos entregados y top 5 productos.
// Solo-admin del lado del backend (requireRole("admin")): el token sale de la sesión de staff.
function MonthReportCard({ month, onMonthChange }: { month: string; onMonthChange: (value: string) => void }) {
  const { token } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setReport(null);
    setError(null);
    api.reportsMonthly(token, month)
      .then(setReport)
      .catch(e => setError(e instanceof Error ? e.message : "Error al cargar el reporte"));
  }, [token, month]);

  const maxQty = report?.topProducts[0]?.qty ?? 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <input type="month" value={month} onChange={e => onMonthChange(e.target.value)}
        className="mb-4 px-3 py-2 border border-border rounded-lg bg-background text-sm font-semibold" />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !report && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {report && (
        <>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4 capitalize">
            {monthLabel(report.month)}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <p className="font-display font-bold text-2xl text-primary">{formatCurrency(report.totalSales)}</p>
              <p className="text-xs text-muted-foreground">Ventas (entregados)</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl">{report.orderCount}</p>
              <p className="text-xs text-muted-foreground">Pedidos entregados</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top 5 productos</p>
          {report.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin pedidos este mes</p>
          ) : (
            <div className="space-y-4">
              {report.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate mb-1">{p.name}</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-primary shrink-0">{p.qty}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Pantalla de reportes: ventas y top 5 de productos de dos meses elegibles, lado a lado para comparar.
export function AdminReports() {
  const [monthA, setMonthA] = useState(toMonthValue(lastMonth));
  const [monthB, setMonthB] = useState(toMonthValue(twoMonthsAgo));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Panel administrativo</p>
      <h1 className="font-display text-4xl font-bold mb-2">Reportes</h1>
      <p className="text-muted-foreground mb-8">Elegí dos meses para ver sus ventas y compararlos.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MonthReportCard month={monthA} onMonthChange={setMonthA} />
        <MonthReportCard month={monthB} onMonthChange={setMonthB} />
      </div>
    </div>
  );
}
