import { Clock } from "lucide-react";
import { timeAgo } from "./timeAgo";

// Pastilla que muestra hace cuánto ingresó un pedido, con color según la urgencia.
export function AgeIndicator({ createdAt }: { createdAt: string }) {
  const { label, minutes } = timeAgo(createdAt);
  const color =
    minutes < 10 ? "text-green-700 bg-green-50 border-green-200" :
    minutes < 25 ? "text-amber-700 bg-amber-50 border-amber-200" :
                   "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${color}`}>
      <Clock size={10} />
      {label}
    </span>
  );
}
