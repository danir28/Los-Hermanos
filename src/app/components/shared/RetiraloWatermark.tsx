// Watermark chico ("RETIRALO" en mayúsculas) que identifica al sistema como producto en sí,
// separado de la marca de la rotisería. Pensado para el pie de pantallas de staff (ej. debajo
// del botón de login) — usa text-muted-foreground en vez de un color fijo de --retiralo-* para
// heredar el contraste ya verificado del tema activo (claro/oscuro) de la app anfitriona.
export function RetiraloWatermark() {
  return (
    <p className="font-retiralo-body text-center text-[10px] font-medium tracking-[0.2em] text-muted-foreground/70">
      RETIRALO
    </p>
  );
}
