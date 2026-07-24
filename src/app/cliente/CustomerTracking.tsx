import { useState } from "react";
import { Search, Clock, CheckCircle, Phone, User, ClipboardList, Check, AlertCircle, Ban } from "lucide-react";
import type { Order, OrderStatus } from "../types";
import { STATUS } from "../data/statusConfig";
import { StatusBadge, TypePill } from "../components/shared";
import { STATUS_MESSAGES } from "./statusMessages";
import { api } from "../lib/api";
import { formatTimeLabel } from "../lib/time";

// Pantalla de seguimiento de pedido: buscar por número o teléfono y ver la línea de tiempo del estado.
// Busca contra GET /api/orders/lookup (pública, devuelve un único pedido) en vez de filtrar un
// array completo recibido por props — ese array ya no existe del lado del cliente porque
// GET /api/orders pasó a ser solo-staff (expondría nombre/teléfono de todos los clientes).
export function CustomerTracking({ preloadOrder }: { preloadOrder?: Order }) {
  const [searchType, setSearchType] = useState<"numero" | "telefono">("numero");
  const [query, setQuery] = useState(preloadOrder?.orderNumber ?? "");
  const [searched, setSearched] = useState(!!preloadOrder);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Order | "not-found" | null>(preloadOrder ?? null);

  // Busca el pedido contra el backend según el criterio elegido (número o teléfono) y guarda
  // el resultado, o "not-found" si el backend no encontró coincidencias, para distinguirlo
  // del estado inicial (result === null, todavía no se buscó nada).
  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const found = await api.ordersLookup(searchType === "numero" ? { orderNumber: trimmed } : { phone: trimmed });
      setResult(found ?? "not-found");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al buscar el pedido");
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  const statuses: OrderStatus[] = ["Pendiente", "Programado", "En preparación", "Listo para retirar", "Entregado"];

  const SearchForm = (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Rotisería Los Hermanos</p>
      <h1 className="font-display text-4xl font-bold mb-2">Seguimiento</h1>
      <p className="text-muted-foreground mb-8">Consultá el estado de tu pedido con el número de pedido o tu teléfono.</p>

      <div className="bg-card border border-border rounded-2xl p-6">
        {/* Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-muted rounded-xl">
          <button onClick={() => setSearchType("numero")}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${searchType === "numero" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
            Nº de Pedido
          </button>
          <button onClick={() => setSearchType("telefono")}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${searchType === "telefono" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
            Teléfono
          </button>
        </div>

        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          {searchType === "numero" ? "Número de pedido" : "Número de teléfono"}
        </label>
        <div className="relative mb-4">
          {searchType === "numero"
            ? <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          }
          <input
            type="text"
            placeholder={searchType === "numero" ? "Ej: 001" : "Ej: 11-4521-8890"}
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); setResult(null); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-base placeholder:text-muted-foreground"
          />
        </div>

        {searched && result === "not-found" && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-2.5 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>No encontramos ningún pedido con ese dato. Verificá el número o teléfono ingresado.</span>
          </div>
        )}

        <button onClick={handleSearch} disabled={!query.trim() || loading}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          <Search size={17} /> {loading ? "Consultando…" : "Consultar estado"}
        </button>
      </div>
    </div>
  );

  if (!searched || result === null) return SearchForm;
  if (result === "not-found") return SearchForm;

  const order = result;
  const currentIndex = order.status === "Cancelado" ? -1 : statuses.indexOf(order.status);

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <button onClick={() => { setResult(null); setSearched(false); setQuery(""); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        ← Buscar otro pedido
      </button>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Pedido</p>
            <p className="font-mono font-bold text-3xl text-primary">#{order.orderNumber}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex items-center gap-2 mb-1 text-sm">
          <User size={13} className="text-muted-foreground" />
          <span className="font-semibold">{order.customer}</span>
        </div>
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>Ingresó a las {formatTimeLabel(order.createdAt)}</span>
          <span>·</span>
          <TypePill type={order.type} />
        </div>

        {/* Estimated time */}
        {order.estimatedTime && order.status !== "Cancelado" && (
          <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horario de retiro</p>
              <p className="font-mono font-bold text-2xl text-foreground">{formatTimeLabel(order.estimatedTime!)}</p>
            </div>
          </div>
        )}

        {/* Status message */}
        <div className={`p-3.5 rounded-xl text-sm leading-relaxed flex gap-2.5 ${order.status === "Cancelado" ? "bg-red-50 border border-red-200 text-red-800" : "bg-secondary border border-border text-foreground"}`}>
          {order.status === "Cancelado" ? <Ban size={15} className="shrink-0 mt-0.5 text-red-600" /> : <CheckCircle size={15} className="shrink-0 mt-0.5 text-primary" />}
          <span>{STATUS_MESSAGES[order.status]}</span>
        </div>
      </div>

      {/* Timeline (only for non-cancelled) */}
      {order.status !== "Cancelado" ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progreso del pedido</p>
          <div className="space-y-0">
            {statuses.map((status, i) => {
              const done = i < currentIndex;
              const current = i === currentIndex;
              const pending = i > currentIndex;
              const { Icon } = STATUS[status];
              return (
                <div key={status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${done ? "bg-green-500 border-green-500" : current ? "bg-primary border-primary" : "bg-card border-border"}`}>
                      {done ? <Check size={15} className="text-white" /> : <Icon size={15} className={pending ? "text-muted-foreground" : "text-white"} />}
                    </div>
                    {i < statuses.length - 1 && <div className={`w-0.5 h-8 mt-1 ${done ? "bg-green-400" : "bg-border"}`} />}
                  </div>
                  <div className="pb-6 pt-1">
                    <p className={`font-medium text-sm ${pending ? "text-muted-foreground" : "text-foreground"}`}>{STATUS[status].label}</p>
                    {current && <p className="text-xs text-primary mt-0.5 font-medium">← Estado actual</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <Ban size={32} className="text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-800 mb-1">Pedido cancelado</p>
          <p className="text-sm text-red-700">Si tenés alguna consulta, llamanos al <span className="font-mono font-bold">4521-8800</span></p>
        </div>
      )}
    </div>
  );
}
