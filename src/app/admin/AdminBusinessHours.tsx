import { useEffect, useState } from "react";
import { Clock, Save } from "lucide-react";
import { api, type DaySchedule } from "../lib/api";
import { useAuth } from "../auth";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Pantalla de Horario de atención: el admin define, por día de la semana, si el local abre y en
// qué franja horaria. PUT /api/business-hours siempre reemplaza la semana completa (no hay
// edición parcial de un solo día), así que "Guardar" manda los 7 días juntos.
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
  // la semana completa recién cuando se hace click en "Guardar".
  const updateDay = (dayOfWeek: number, patch: Partial<DaySchedule>) => {
    setDays(prev => prev && prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Configuración</p>
        <h1 className="font-display text-4xl font-bold">Horario de atención</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          Definí el horario de apertura y cierre de cada día. Se muestra en la Home del cliente y
          además bloquea el checkout online fuera de este horario (los pedidos que carga
          recepción manualmente no se ven afectados).
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {sorted.map(day => (
          <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <label className="flex items-center gap-2 w-32 shrink-0 font-medium text-sm">
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={e => updateDay(day.dayOfWeek, { isOpen: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              {DAY_LABELS[day.dayOfWeek]}
            </label>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-muted-foreground" />
              <input
                type="time"
                value={day.openTime}
                disabled={!day.isOpen}
                onChange={e => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                className="border border-border rounded-lg px-2 py-1.5 bg-background disabled:opacity-40"
              />
              <span className="text-muted-foreground">a</span>
              <input
                type="time"
                value={day.closeTime}
                disabled={!day.isOpen}
                onChange={e => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                className="border border-border rounded-lg px-2 py-1.5 bg-background disabled:opacity-40"
              />
            </div>
            {!day.isOpen && <span className="text-xs text-muted-foreground">Cerrado</span>}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
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
