import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Plus, Save, Trash2 } from "lucide-react";
import { api, type BusinessHours, type SlotTimeRange, type SlotWindowDay } from "../lib/api";
import { useAuth } from "../auth";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DEFAULT_RANGE = { startTime: "19:00", endTime: "22:00" };

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Mismo criterio que assertNoOverlaps del backend (server/src/slotWindows/service.ts): las
// franjas de retiro nunca cruzan la medianoche, así que alcanza compararlas como intervalos
// simples (sin el truco de "sumar 24hs" que sí hace falta para el horario de atención).
function hasOverlappingRanges(ranges: SlotTimeRange[]): boolean {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  return sorted.some((range, i) => i > 0 && toMinutes(range.startTime) <= toMinutes(sorted[i - 1].endTime));
}

// Fin de una franja de atención en la línea de tiempo continua — si cruza la medianoche
// (closeTime <= openTime) se le suman 24hs. Mismo criterio que businessRangeEndMinutes del
// backend; se duplica acá porque frontend y backend son paquetes npm separados sin código
// compartido (ver la misma decisión ya tomada para hasOverlappingRanges de BusinessHours).
function businessRangeEndMinutes(range: { openTime: string; closeTime: string }): number {
  const open = toMinutes(range.openTime);
  const close = toMinutes(range.closeTime);
  return close <= open ? close + 24 * 60 : close;
}

// true si la franja de retiro cae completamente dentro de alguna franja de atención de ese día.
function isWithinBusinessHours(range: SlotTimeRange, businessDay: BusinessHours["days"][number] | undefined): boolean {
  if (!businessDay || !businessDay.isOpen) return false;
  const start = toMinutes(range.startTime);
  const end = toMinutes(range.endTime);
  return businessDay.ranges.some(br => start >= toMinutes(br.openTime) && end <= businessRangeEndMinutes(br));
}

// Texto del horario de atención de un día, para mostrar de referencia junto a sus franjas de
// retiro (así cocina ve contra qué se está validando sin tener que ir a la otra pantalla).
function businessHoursText(businessDay: BusinessHours["days"][number] | undefined): string {
  if (!businessDay || !businessDay.isOpen || businessDay.ranges.length === 0) return "el local está cerrado este día";
  return businessDay.ranges.map(r => `${r.openTime} a ${r.closeTime}`).join(", ");
}

// Pantalla de Horarios de cocina: define, por día de la semana, entre qué horas la grilla de
// turnos (SlotPicker) ofrece horarios de retiro ese día — no confundir con el "Horario de
// atención" del admin (esa es la ventana en la que el local está abierto; esta es, más angosta,
// en la que se puede RETIRAR un pedido programado). Soporta franjas múltiples por día, calcadas
// de un horario partido del local (ej. una franja de mediodía y otra de noche); cada franja
// tiene que caer completamente dentro de alguna franja de atención de ese mismo día — el
// backend lo vuelve a validar al guardar, esto es solo para avisar antes. PUT /api/slot-windows
// siempre reemplaza la semana completa.
export function KitchenSlotWindows() {
  const { token } = useAuth();
  const [days, setDays] = useState<SlotWindowDay[] | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!token) return;
    api.slotWindowsGet(token)
      .then(r => setDays(r.days))
      .catch(e => setMessage({ text: e instanceof Error ? e.message : "Error al cargar la grilla de turnos", error: true }));
    // Pública (igual que en CustomerHome): solo se usa acá para mostrar de referencia y validar
    // en el cliente contra qué horario de atención se está chequeando cada franja de retiro.
    api.businessHoursGet().then(setBusinessHours).catch(() => {});
  }, [token]);

  const updateDay = (dayOfWeek: number, patch: Partial<SlotWindowDay>) => {
    setDays(prev => prev && prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const addRange = (dayOfWeek: number) => {
    setDays(prev => prev && prev.map(d => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const last = d.ranges[d.ranges.length - 1] ?? DEFAULT_RANGE;
      return { ...d, ranges: [...d.ranges, { ...last }] };
    }));
  };

  const removeRange = (dayOfWeek: number, rangeIndex: number) => {
    setDays(prev => prev && prev.map(d =>
      d.dayOfWeek === dayOfWeek ? { ...d, ranges: d.ranges.filter((_, i) => i !== rangeIndex) } : d
    ));
  };

  const updateRange = (dayOfWeek: number, rangeIndex: number, patch: Partial<SlotTimeRange>) => {
    setDays(prev => prev && prev.map(d =>
      d.dayOfWeek === dayOfWeek
        ? { ...d, ranges: d.ranges.map((r, i) => (i === rangeIndex ? { ...r, ...patch } : r)) }
        : d
    ));
  };

  // Guarda la semana completa y refleja lo que devuelve el backend (no lo que había en el
  // estado local optimísticamente), para quedar en sync si algo se normalizó del otro lado.
  const handleSave = async () => {
    if (!token || !days) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.slotWindowsUpdate(token, days);
      setDays(result.days);
      setMessage({ text: "Grilla de turnos guardada.", error: false });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Error al guardar la grilla de turnos", error: true });
    } finally {
      setSaving(false);
    }
  };

  if (!days) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-muted-foreground">
        {message?.error ? message.text : "Cargando grilla de turnos…"}
      </div>
    );
  }

  const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const businessByDay = new Map(businessHours?.days.map(d => [d.dayOfWeek, d]) ?? []);
  const dayHasErrors = (day: SlotWindowDay) =>
    hasOverlappingRanges(day.ranges) || day.ranges.some(r => !isWithinBusinessHours(r, businessByDay.get(day.dayOfWeek)));
  const anyError = sorted.some(dayHasErrors);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Configuración</p>
        <h1 className="font-display text-4xl font-bold">Horarios de retiro</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Definí, para cada día de la semana, entre qué horas se puede elegir un turno de retiro
          al cargar un pedido (la grilla que ves en "Nuevo Pedido" y en "Reprogramar"). Un día
          puede tener más de una franja (ej. una de mediodía y otra de noche), pero cada franja
          tiene que caer dentro del horario de atención del local ese día — no se puede ofrecer
          un turno de retiro cuando el local está cerrado.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {sorted.map(day => {
          const business = businessByDay.get(day.dayOfWeek);
          return (
            <div key={day.dayOfWeek} className="flex flex-wrap items-start gap-4 px-5 py-4">
              <div className="w-40 shrink-0">
                <p className="font-medium text-sm">{DAY_LABELS[day.dayOfWeek]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Local: {businessHoursText(business)}</p>
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
                {day.ranges.map((range, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                      <input
                        type="time"
                        value={range.startTime}
                        onChange={e => updateRange(day.dayOfWeek, i, { startTime: e.target.value })}
                        className="border border-border rounded-lg px-2 py-1.5 bg-background"
                      />
                      <span className="text-muted-foreground">a</span>
                      <input
                        type="time"
                        value={range.endTime}
                        onChange={e => updateRange(day.dayOfWeek, i, { endTime: e.target.value })}
                        className="border border-border rounded-lg px-2 py-1.5 bg-background"
                      />
                      {day.ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRange(day.dayOfWeek, i)}
                          className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                          aria-label="Quitar franja"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {!isWithinBusinessHours(range, business) && (
                      <p className="flex items-center gap-1.5 text-xs text-red-600 ml-6">
                        <AlertTriangle size={12} />
                        Se sale del horario de atención del local ese día.
                      </p>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRange(day.dayOfWeek)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                >
                  <Plus size={12} />
                  Agregar franja
                </button>
                {hasOverlappingRanges(day.ranges) && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle size={12} />
                    Estas franjas se superponen o se tocan entre sí — dejá un hueco real entre una y la otra.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || anyError}
          title={anyError ? "Corregí las franjas inválidas antes de guardar" : undefined}
          className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={14} />
          {saving ? "Guardando…" : "Guardar horarios"}
        </button>
        {message && <p className={`text-sm ${message.error ? "text-red-600" : "text-green-700"}`}>{message.text}</p>}
      </div>
    </div>
  );
}
