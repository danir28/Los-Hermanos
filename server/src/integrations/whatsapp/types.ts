// Contrato provisorio con el agente de WhatsApp (Twilio).
// Ajustar cuando se defina el formato final junto al desarrollador del agente.

export type WhatsappInboundEvent = {
  type: string; // ej: "new_order" | "status_query"
  from: string; // número de teléfono del cliente
  payload: Record<string, unknown>;
};

export type WhatsappOutboundMessage = {
  to: string;
  message: string;
};
