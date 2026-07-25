import type { LucideIcon } from "lucide-react";

// Un tab de la barra de navegación interna de un rol (recepción, cocina, admin).
export type NavTab = { key: string; label: string; Icon: LucideIcon };

// Barra de navegación por tabs con ícono, usada por las vistas internas de recepción, cocina y admin.
export function RoleNavTabs({ tabs, active, onSelect }: { tabs: NavTab[]; active: string; onSelect: (key: string) => void }) {
  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 flex">
        {tabs.map(t => (
          <button key={t.key} onClick={() => onSelect(t.key)} data-testid={`nav-tab-${t.key}`}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.Icon size={15} />{t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
