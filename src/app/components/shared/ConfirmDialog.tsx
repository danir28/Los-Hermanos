// Diálogo modal de confirmación genérico, para acciones destructivas o irreversibles.
export function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <h2 className="font-display font-bold text-xl mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm mb-5">{description}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel}
            className="py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-secondary transition-colors">
            Volver
          </button>
          <button onClick={onConfirm}
            className="py-2.5 rounded-xl bg-destructive text-white font-semibold text-sm hover:bg-destructive/90 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
