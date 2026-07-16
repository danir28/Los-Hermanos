import type { OrderType } from "../../types";

// Pastilla visual que muestra el canal de origen de un pedido (online, presencial, telefónico, whatsapp).
export function TypePill({ type }: { type: OrderType }) {
  const colors: Record<OrderType, string> = {
    online:      "bg-violet-50 border-violet-200 text-violet-700",
    presencial:  "bg-teal-50 border-teal-200 text-teal-700",
    telefónico:  "bg-sky-50 border-sky-200 text-sky-700",
    whatsapp:    "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const icons: Record<OrderType, string> = { online: "🌐", presencial: "🏠", telefónico: "📞", whatsapp: "💬" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${colors[type]}`}>
      <span className="text-[10px]">{icons[type]}</span>{type}
    </span>
  );
}
