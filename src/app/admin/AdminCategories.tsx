import { Plus, Trash2, Edit } from "lucide-react";

// Gestión de categorías del catálogo.
export function AdminCategories() {
  const cats = [
    { name: "Pollo",        emoji: "🍗", count: 3, order: 1 },
    { name: "Ensaladas",    emoji: "🥗", count: 2, order: 2 },
    { name: "Guarniciones", emoji: "🍟", count: 1, order: 3 },
    { name: "Empanadas",    emoji: "🫓", count: 2, order: 4 },
    { name: "Especiales",   emoji: "⭐", count: 2, order: 5 },
  ];
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Categorías</h1>
          <p className="text-muted-foreground mt-1 text-sm">{cats.length} categorías configuradas</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>
      <div className="space-y-2.5">
        {cats.map(cat => (
          <div key={cat.name} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="text-3xl">{cat.emoji}</div>
            <div className="flex-1">
              <p className="font-semibold">{cat.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.count} producto{cat.count !== 1 ? "s" : ""} · Orden #{cat.order}</p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">Activa</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><Edit size={15} /></button>
              <button className="p-1.5 rounded-lg hover:bg-red-50 text-destructive transition-colors"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
