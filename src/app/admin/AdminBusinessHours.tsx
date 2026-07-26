import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Plus, Save, Trash2 } from "lucide-react";
import { api, type DaySchedule, type TimeRange } from "../lib/api";
import { useAuth } from "../auth";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DEFAULT_RANGE = { openTime: "09:00", closeTime: "18:00" };

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Mismo criterio que assertNoOverlaps del backend (server/src/businessHours/service.ts): una
// franja que cruza la medianoche (closeTime <= openTime) termina 24hs después en la línea de
// tiempo continua. Se duplica acá (en vez de importarla) porque frontend y backend son paquetes
// npm separados sin código compartido — es la única forma de avisarle al admin ANTES de que
// mande el guardado y se lo rechace el servidor.
function rangeEndMinutes(range: TimeRange): number {
  const open = toMinutes(range.openTime);
  const close = toMinutes(range.closeTime);
  return close <= open ? close + 24 * 60 : close;
}

// true si alguna franja del día se superpone o se toca con otra (sin hueco real entre ambas).
function hasOverlappingRanges(ranges: TimeRange[]): boolean {
  const sorted = [...ranges].sort((a, b) => toMinutes(a.openTime) - toMinutes(b.openTime));
  return sorted.some((range, i) => i > 0 && toMinutes(range.openTime) <= rangeEndMinutes(sorted[i - 1]));
}

// Pantalla de Horario de atención: el admin define, por día de la semana, si el local abre y en
// qué franja(s) horaria(s) — soporta horario partido (ej. abre 11-15 y vuelve a abrir 19-23 el
// mismo día). PUT /api/business-hours siempre reemplaza la semana completa (no hay edición
// parcial de un solo día), así que "Guardar" manda los 7 días juntos.
export function AdminBusinessHours() {
  const { token } = useAuth();
  const [days, setDays] = useState<DaySchedule[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    api.businessHoursGet()
      .then(r => setDays(r.days))
      .catch(e => setMessage({ text: e instanceof Error ? e.message : "Error al cargar el horario", error: true }));
  }, []);

  // Actualiza un único día en el estado local, sin tocar el resto — el guardado sigue mandando
  // la semana completa recién cuando se hace click en "Guardar". Al reabrir un día que había
  // quedado sin franjas (nunca configurado, o vaciado a mano), le agrega una por defecto para
  // no dejarlo en el estado inválido "abierto pero sin horario".
  const updateDay = (dayOfWeek: number, patch: Partial<DaySchedule>) => {
    setDays(prev => prev && prev.map(d => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const next = { ...d, ...patch };
      if (next.isOpen && next.ranges.length === 0) next.ranges = [{ ...DEFAULT_RANGE }];
      return next;
    }));
  };

  // Agrega una franja más al día (horario partido) — copia la última como punto de partida.
  const addRange = (dayOfWeek: number) => {
    setDays(prev => prev && prev.map(d => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const last = d.ranges[d.ranges.length - 1] ?? DEFAULT_RANGE;
      return { ...d, ranges: [...d.ranges, { ...last }] };
    }));
  };

  // Quita una franja puntual. No se permite dejar un día abierto sin ninguna franja: para
  // cerrar el día del todo se usa el checkbox "abierto", no vaciar la lista de franjas.
  const removeRange = (dayOfWeek: number, rangeIndex: number) => {
    setDays(prev => prev && prev.map(d =>
      d.dayOfWeek === dayOfWeek ? { ...d, ranges: d.ranges.filter((_, i) => i !== rangeIndex) } : d
    ));
  };

  const updateRange = (dayOfWeek: number, rangeIndex: number, patch: Partial<{ openTime: string; closeTime: string }>) => {
    setDays(prev => prev && prev.map(d =>
      d.dayOfWeek === dayOfWeek
        ? { ...d, ranges: d.ranges.map((r, i) => (i === rangeIndex ? { ...r, ...patch } : r)) }
        : d
    ));
  };

  // Guarda la semana completa contra el backend y refleja lo que devuelve (no lo que había en
  // el estado local optimísticamente), para quedar en sync si el backend normalizó algo.
  const handleSave = async () => {
    if (!token || !days) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.businessHoursUpdate(token, days);
      setDays(result.days);
      setMessage({ text: "Horario guardado.", error: false });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Error al guardar el horario", error: true });
    } finally {
      setSaving(false);
    }
  };

  if (!days) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-muted-foreground">
        {message?.error ? message.text : "Cargando horario…"}
      </div>
    );
  }

  const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const anyOverlap = sorted.some(day => hasOverlappingRanges(day.ranges));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Configuración</p>
        <h1 className="font-display text-4xl font-bold">Horario de atención</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Definí el horario de apertura y cierre de cada día. Un día puede tener más de una franja
          horaria (por ejemplo, si cierra al mediodía y vuelve a abrir a la noche) — usá "Agregar
          franja" para eso. Se muestra en la Home del cliente y además bloquea el checkout online
          fuera de este horario (los pedidos que carga recepción manualmente no se ven afectados).
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {sorted.map(day => (
          <div key={day.dayOfWeek} className="flex flex-wrap items-start gap-4 px-5 py-4">
            <label className="flex items-center gap-2 w-32 shrink-0 font-medium text-sm pt-1.5">
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={e => updateDay(day.dayOfWeek, { isOpen: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              {DAY_LABELS[day.dayOfWeek]}
            </label>

            {day.isOpen ? (
              <div className="flex flex-col gap-2 flex-1 min-w-[280px]">
                {day.ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                    <input
                      type="time"
                      value={range.openTime}
                      onChange={e => updateRange(day.dayOfWeek, i, { openTime: e.target.value })}
                      className="border border-border rounded-lg px-2 py-1.5 bg-background"
                    />
                    <span className="text-muted-foreground">a</span>
                    <input
                      type="time"
                      value={range.closeTime}
                      onChange={e => updateRange(day.dayOfWeek, i, { closeTime: e.target.value })}
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
            ) : (
              <span className="text-xs text-muted-foreground pt-1.5">Cerrado</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || anyOverlap}
          title={anyOverlap ? "Corregí las franjas superpuestas antes de guardar" : undefined}
          className="text-sm bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={14} />
          {saving ? "Guardando…" : "Guardar horario"}
        </button>
        {message && <p className={`text-sm ${message.error ? "text-red-600" : "text-green-700"}`}>{message.text}</p>}
      </div>
    </div>
  );
}
