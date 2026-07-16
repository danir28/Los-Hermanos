import { useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";
import { TypePill } from "../components/shared";
import { AgeIndicator } from "./AgeIndicator";
import { REPROG_REASONS } from "./reprogReasons";

// Pantalla de cocina para asignar u reprogramar el horario de retiro de un pedido.
export function KitchenAssign({ orders, onAssigned, preselectedId }: { orders: Order[]; onAssigned: (id: string, time: string) => void; preselectedId: string | null }) {
  const [selectedId, setSelectedId] = useState(preselectedId ?? "");
  const [time, setTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [flash, setFlash] = useState(false);

  const needsTime = orders.filter(o => o.status !== "Entregado" && o.status !== "Cancelado");
  const selected = orders.find(o => o.id === selectedId);
  const isReprogramming = !!(selected?.estimatedTime);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setReason("");
    const o = orders.find(x => x.id === id);
    setTime(o?.estimatedTime ?? "12:00");
  };

  const handleConfirm = () => {
    if (!selectedId || !time) return;
    if (isReprogramming && !reason) return;
    onAssigned(selectedId, time);
    setFlash(true);
    setTimeout(() => { setFlash(false); setSelectedId(""); setReason(""); }, 1600);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Gestión de producción</p>
      <h1 className="font-display text-4xl font-bold mb-2">Asignación de Horarios</h1>
      <p className="text-muted-foreground mb-8">Asigná o reprogramá el horario estimado de retiro para cada pedido.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pedidos activos ({needsTime.length})</p>
          <div className="space-y-2">
            {needsTime.map(order => {
              const hasTime = !!order.estimatedTime;
              return (
                <button key={order.id} onClick={() => handleSelect(order.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === order.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-primary">#{order.id}</span>
                    <div className="flex items-center gap-2">
                      {hasTime
                        ? <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{order.estimatedTime} hs</span>
                        : <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">Sin horario</span>
                      }
                      <AgeIndicator createdAt={order.createdAt} />
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-0.5">{order.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</p>
                </button>
              );
            })}
            {needsTime.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle size={36} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">No hay pedidos activos</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment form */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                {isReprogramming ? "Reprogramar horario" : "Asignar horario de retiro"}
              </p>

              {/* Order summary */}
              <div className="bg-secondary rounded-xl p-4 mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-primary text-lg">#{selected.id}</span>
                  <TypePill type={selected.type} />
                </div>
                <p className="font-bold mb-1">{selected.customer}</p>
                <p className="text-xs text-muted-foreground font-mono mb-3">{selected.phone}</p>
                <div className="space-y-1 mb-3">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                      <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="font-mono text-primary">{formatCurrency(selected.total)}</span>
                </div>
              </div>

              {/* Current time (if reprogramming) */}
              {isReprogramming && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                  <Clock size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Horario actualmente asignado</p>
                    <p className="font-mono font-bold text-blue-800 text-lg">{selected.estimatedTime} hs</p>
                  </div>
                </div>
              )}

              {/* New time input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  {isReprogramming ? "Nueva hora de retiro" : "Hora estimada de retiro"}
                </label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full px-4 py-4 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-2xl text-center" />
              </div>

              {/* Reason (only for reprogramming) */}
              {isReprogramming && (
                <div className="mb-5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Motivo de reprogramación <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {REPROG_REASONS.map(r => (
                      <label key={r} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all text-sm ${reason === r ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"}`}>
                        <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-primary" />
                        {r}
                      </label>
                    ))}
                  </div>
                  {isReprogramming && !reason && (
                    <p className="text-xs text-amber-700 mt-2">Seleccioná un motivo para continuar</p>
                  )}
                </div>
              )}

              {flash ? (
                <div className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> {isReprogramming ? "¡Reprogramado!" : "¡Horario asignado!"} → Programado
                </div>
              ) : (
                <button onClick={handleConfirm} disabled={isReprogramming && !reason}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                  {isReprogramming ? `Reprogramar — ${time} hs` : `Confirmar — Retiro a las ${time} hs`}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <Clock size={40} className="mb-4 opacity-25" />
              <p className="text-sm">Seleccioná un pedido para asignar o reprogramar su horario de retiro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

