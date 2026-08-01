import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

// Carpeta donde se guardan las fotos de producto subidas desde el admin, en disco del propio
// servidor (no un bucket externo — decisión consciente para mantener costos bajos en este
// proyecto, ver memoria de precios). No versionada en git (server/.gitignore) y no la toca
// `git pull` del auto-deploy (server/scripts/deploy.sh), así que las fotos sobreviven a cada
// deploy sin que haga falta backupearlas aparte del resto del servidor.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads", "products");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB, generoso para una foto de celular sin comprimir

// Multer guarda el archivo con un nombre generado (no el original) para evitar colisiones y
// path traversal — ver deleteImageFile en service.ts, que asume que el nombre en disco es
// justamente el basename de la url guardada.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const productImageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Formato de imagen no permitido (usá JPG, PNG, WEBP o GIF)"));
      return;
    }
    cb(null, true);
  },
});
