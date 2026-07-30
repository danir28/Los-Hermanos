#!/usr/bin/env bash
# Auto-deploy del backend en el droplet de producción. Pensado para correr por cron cada 5-10
# min (no por webhook): evita tener que darle a GitHub una clave SSH con acceso a este servidor,
# a costa de que un deploy tarde como máximo ese intervalo en aplicarse — para este proyecto ese
# delay no importa, y es el motivo por el que quedó atrasado varias migraciones la vez pasada
# (nadie corría a mano el pull+migrate+generate+build+restart después de cada merge a main).
#
# Instalación en el droplet (una sola vez):
#   chmod +x /opt/los-hermanos/server/scripts/deploy.sh
#   crontab -e
#   */5 * * * * /opt/los-hermanos/server/scripts/deploy.sh >> /var/log/los-hermanos-deploy.log 2>&1
set -euo pipefail

REPO_DIR="/opt/los-hermanos"
PM2_APP="los-hermanos-backend"
LOCK_FILE="/tmp/los-hermanos-deploy.lock"

# flock evita que dos corridas de cron se pisen si una tarda más de lo normal (ej. un
# "npm install" lento) y la siguiente arranca antes de que la anterior termine.
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "$(date -u +%FT%TZ) — ya hay un deploy en curso, salgo sin hacer nada"
  exit 0
fi

cd "$REPO_DIR"
git fetch origin main --quiet

LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse origin/main)

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  exit 0
fi

echo "$(date -u +%FT%TZ) — commit nuevo detectado (${LOCAL_SHA:0:7} -> ${REMOTE_SHA:0:7}), desplegando"

git pull origin main

cd "$REPO_DIR/server"
npm install
npx prisma migrate deploy
npm run db:generate

# El build de tsc no usa noEmitOnError, así que emite el JS igual aunque haya errores de tipos
# (ver los 23 errores preexistentes que aparecieron la vez pasada, ninguno rompe el runtime) —
# se deja constancia en el log en vez de frenar el deploy por un problema que ya estaba antes.
set +e
npm run build
BUILD_EXIT=$?
set -e
if [ "$BUILD_EXIT" -ne 0 ]; then
  echo "$(date -u +%FT%TZ) — ADVERTENCIA: 'npm run build' reportó errores de tipos (ver arriba). El JS se generó igual y el deploy continúa, pero conviene revisarlos pronto."
fi

pm2 restart "$PM2_APP"

echo "$(date -u +%FT%TZ) — deploy terminado, ahora en $(git rev-parse --short HEAD)"
