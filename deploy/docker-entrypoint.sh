#!/usr/bin/env bash
# VitaLink backend entrypoint — prepare DB (Node/mysql2) + sobe a API
set -uo pipefail

log() { echo "[vitalink-entrypoint] $*"; }

log "Preparando banco (mysql2)..."
if ! node /app/src/scripts/db-prepare.js; then
  log "ERRO: db-prepare falhou."
  exit 1
fi

log "Iniciando API: $*"
exec "$@"
