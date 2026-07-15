import { config, isWhatsappConfigured } from "../../config.js";
import type { WhatsappOutboundMessage } from "./types.js";

export class WhatsappNotConfiguredError extends Error {
  constructor() {
    super("El agente de WhatsApp no está configurado. Completá WHATSAPP_AGENT_URL en server/.env");
    this.name = "WhatsappNotConfiguredError";
  }
}

// El agente ya maneja la conexión con Twilio; este backend le habla a la API
// del agente, no directamente a Twilio.
// TODO: ajustar la ruta y el payload una vez definido el contrato con el agente.
export async function sendWhatsappMessage({ to, message }: WhatsappOutboundMessage): Promise<void> {
  if (!isWhatsappConfigured()) throw new WhatsappNotConfiguredError();

  const res = await fetch(`${config.whatsapp.agentUrl}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.whatsapp.agentApiKey ? { Authorization: `Bearer ${config.whatsapp.agentApiKey}` } : {}),
    },
    body: JSON.stringify({ to, message }),
  });

  if (!res.ok) {
    throw new Error(`El agente de WhatsApp respondió ${res.status}: ${await res.text()}`);
  }
}
