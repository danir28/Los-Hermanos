import { Clock } from "lucide-react";
import { timeAgo } from "./timeAgo";

// Pastilla que muestra hace cuánto ingresó un pedido. Mientras no tenga horario asignado, usa
// semáforo de urgencia (verde <5min, amarillo 5-10min, rojo >10min); una vez que cocina le asignó
// un horario, se muestra en un color neutro porque ya no hay presión por confirmárselo.
export function AgeIndicator({ createdAt, hasSchedule }: { createdAt: string; hasSchedule: boolean }) {
  const { label, minutes } = timeAgo(createdAt);
  const color = hasSchedule
    ? "text-muted-foreground bg-secondary border-border"
    : minutes < 5  ? "text-green-700 bg-green-50 border-green-200" :
      minutes < 10 ? "text-amber-700 bg-amber-50 border-amber-200" :
                     "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${color}`}>
      <Clock size={10} />
      {label}
    </span>
  );
}
