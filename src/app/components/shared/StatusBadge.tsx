import { STATUS } from "../../data/statusConfig";
import type { OrderStatus } from "../../types";

// Pastilla visual que muestra el estado de un pedido con su ícono y color asociado.
export function StatusBadge({ status }: { status: OrderStatus }) {
  const { badge, label, Icon } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
