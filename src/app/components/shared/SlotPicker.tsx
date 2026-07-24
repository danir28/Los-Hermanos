import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api, type SlotAvailability } from "../../lib/api";

// Selector de turno de retiro, reusado en el checkout del cliente, la carga manual de
// recepción/cocina y la reprogramación de cocina (ver server/src/orders/slots.ts para las
// reglas de negocio: turnos de 5 en 5 minutos, cupo 4 por turno, no se puede elegir uno pasado).
// Grilla de chips en vez de un <select> nativo: con ~48 turnos en el rango, es más rápido de
// escanear visualmente para diferenciar "lleno" de "pasado" de "disponible".
//
// refreshSignal es un valor cualquiera (ej. un contador) que el padre puede cambiar para forzar
// un refetch de disponibilidad — se usa cuando el submit del formulario que contiene este picker
// recibe un 409 "turno lleno" (dos personas reservando el último cupo casi al mismo tiempo) y
// necesita que la grilla se actualice para reflejar el estado real.
export function SlotPicker({ value, onChange, refreshSignal, required = true }: { value: string | null; onChange: (slot: string) => void; refreshSignal?: number; required?: boolean }) {
  const [slots, setSlots] = useState<SlotAvailability[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.ordersSlots()
      .then(setSlots)
      .catch(() => setError(true));
  }, [refreshSignal]);

  if (error) {
    return <p className="text-sm text-red-600">No se pudo cargar la disponibilidad de horarios.</p>;
  }
  if (!slots) {
    return <p className="text-sm text-muted-foreground">Cargando horarios disponibles…</p>;
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Clock size={13} /> Horario de retiro
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {slots.map(slot => {
          const selected = value === slot.time;
          const disabled = !slot.available && !selected;
          const full = !slot.isPast && slot.taken >= slot.capacity;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot.time)}
              title={slot.isPast ? "Ese horario ya pasó" : full ? "Ese horario ya no tiene cupos" : undefined}
              className={`px-2 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : disabled
                    ? "border-border bg-muted text-muted-foreground/50 cursor-not-allowed line-through"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
      {!value && required && <p className="text-xs text-amber-700 mt-2">Elegí un horario para continuar.</p>}
    </div>
  );
}
