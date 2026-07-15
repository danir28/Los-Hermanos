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

export const isFudoConfigured = () => Boolean(config.fudo.apiUrl && config.fudo.apiKey);
export const isWhatsappConfigured = () => Boolean(config.whatsapp.agentUrl);
