-- Se elimina la integración con el agente de WhatsApp: el cliente resuelve la derivación a la
-- web con la respuesta automática nativa de WhatsApp Business, sin bot ni backend de por medio.
DROP TABLE IF EXISTS "whatsapp_inbound_events";
DROP TABLE IF EXISTS "whatsapp_outbound_messages";
