import { RetiraloIcon } from "./RetiraloIcon";

// Lockup completo de la marca "Retiralo" (isotipo + nombre + tagline), para pantallas donde
// el sistema se presenta como producto en sí (ej. splash, "acerca de") — no para el día a día
// del staff, donde el logo real de la rotisería (src/assets/logo.png) es el protagonista.
export function RetiraloWordmark({ showTagline = true, iconSize = 40 }: { showTagline?: boolean; iconSize?: number }) {
  return (
    <div className="flex items-center gap-3">
      <RetiraloIcon size={iconSize} className="shrink-0" />
      <div className="text-left">
        <p className="font-retiralo-display text-xl font-bold leading-none text-retiralo-carbon dark:text-retiralo-hueso">
          Retiralo
        </p>
        {showTagline && (
          <p className="font-retiralo-body text-xs text-retiralo-piedra mt-1">
            Sistema de gestión para rotiserías y restaurantes
          </p>
        )}
      </div>
    </div>
  );
}
