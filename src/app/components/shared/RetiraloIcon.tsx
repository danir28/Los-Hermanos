// Isotipo del sistema "Retiralo": cuadrado redondeado color Brasa con dos barras blancas,
// evocando una comanda de mostrador. Recreado a mano como SVG a partir de la referencia de
// marca (no hay archivo fuente original) — vectorial para verse nítido en cualquier tamaño.
export function RetiraloIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" className="fill-retiralo-brasa" />
      <rect x="6" y="9.8" width="8" height="2.2" rx="1.1" className="fill-retiralo-hueso" />
      <rect x="6" y="13.2" width="12" height="2.2" rx="1.1" className="fill-retiralo-hueso" />
    </svg>
  );
}
