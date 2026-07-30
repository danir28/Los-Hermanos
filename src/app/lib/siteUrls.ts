// URL pública del sitio de cliente (no el de staff) — fuente única para mostrarla en el ticket
// impreso (ver OrderTicket.tsx). Nunca hay que derivarla de window.location: el ticket se imprime
// siempre desde la app de staff (recepción/cocina), así que window.location apuntaría al dominio
// de staff, no al que el cliente final tiene que ver para seguir su pedido.
export const CUSTOMER_SITE_URL = "https://los-hermanos77.netlify.app";
