import "dotenv/config";

// JWT_SECRET es obligatorio: sin él, cualquier token firmado sería inválido apenas
// se reinicie el proceso (o peor, se firmaría con un secreto vacío). Falla rápido
// al arrancar en vez de dejar que /api/auth/login falle recién en el primer request.
const jwtSecret = process.env.JWT_SECRET || "";
if (!jwtSecret) {
  throw new Error('Falta la variable de entorno "JWT_SECRET" (ver server/.env.example)');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  // Lista de orígenes permitidos por CORS, separados por coma (ej. los dos sitios de
  // Netlify: cliente y staff). La librería "cors" acepta un array nativamente.
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean),
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  fudo: {
    apiUrl: process.env.FUDO_API_URL || "",
    apiKey: process.env.FUDO_API_KEY || "",
  },
  whatsapp: {
    agentUrl: process.env.WHATSAPP_AGENT_URL || "",
    agentApiKey: process.env.WHATSAPP_AGENT_API_KEY || "",
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",
  },
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
    vapidSubject: process.env.VAPID_SUBJECT || "",
  },
};

// Indica si hay credenciales de FUDO cargadas (URL y API key) para habilitar la integración.
export const isFudoConfigured = () => Boolean(config.fudo.apiUrl && config.fudo.apiKey);

// Indica si hay una URL del agente de WhatsApp cargada para habilitar la integración.
export const isWhatsappConfigured = () => Boolean(config.whatsapp.agentUrl);

// Indica si hay claves VAPID cargadas para poder enviar notificaciones push (ver server/src/push/).
export const isPushConfigured = () => Boolean(config.push.vapidPublicKey && config.push.vapidPrivateKey);
