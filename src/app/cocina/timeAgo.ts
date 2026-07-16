// Calcula hace cuánto se creó un pedido a partir de su hora de creación, en minutos y como texto legible.
export function timeAgo(createdAt: string): { label: string; minutes: number } {
  const [h, m] = createdAt.split(":").map(Number);
  const now = new Date();
  const created = new Date();
  created.setHours(h, m, 0, 0);
  const diff = Math.max(1, Math.floor((now.getTime() - created.getTime()) / 60000));
  let label = "";
  if (diff < 60) label = `Hace ${diff} min`;
  else {
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    label = mins > 0 ? `Hace ${hrs} h ${mins} min` : `Hace ${hrs} h`;
  }
  return { label, minutes: diff };
}
