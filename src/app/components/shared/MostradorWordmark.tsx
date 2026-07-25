import { MostradorIcon } from "./MostradorIcon";

// Lockup completo de la marca "Mostrador" (isotipo + nombre + tagline), para pantallas donde
// el sistema se presenta como producto en sí (ej. splash, "acerca de") — no para el día a día
// del staff, donde el logo real de la rotisería (src/assets/logo.png) es el protagonista.
export function MostradorWordmark({ showTagline = true, iconSize = 40 }: { showTagline?: boolean; iconSize?: number }) {
  return (
    <div className="flex items-center gap-3">
      <MostradorIcon size={iconSize} className="shrink-0" />
      <div className="text-left">
        <p className="font-mostrador-display text-xl font-bold leading-none text-mostrador-carbon dark:text-mostrador-hueso">
          Mostrador
        </p>
        {showTagline && (
          <p className="font-mostrador-body text-xs text-mostrador-piedra mt-1">
            Sistema de gestión para rotiserías y restaurantes
          </p>
        )}
      </div>
    </div>
  );
}
