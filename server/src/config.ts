import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  fudo: {
    apiUrl: process.env.FUDO_API_URL || "",
    apiKey: process.env.FUDO_API_KEY || "",
  },
  whatsapp: {
    agentUrl: process.env.WHATSAPP_AGENT_URL || "",
    agentApiKey: process.env.WHATSAPP_AGENT_API_KEY || "",
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",
  },
};

// Indica si hay credenciales de FUDO cargadas (URL y API key) para habilitar la integración.
export const isFudoConfigured = () => Boolean(config.fudo.apiUrl && config.fudo.apiKey);

// Indica si hay una URL del agente de WhatsApp cargada para habilitar la integración.
export const isWhatsappConfigured = () => Boolean(config.whatsapp.agentUrl);
