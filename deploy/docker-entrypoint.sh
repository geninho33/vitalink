#!/usr/bin/env bash
# VitaLink backend entrypoint — wait PostgreSQL (Node net) + prepare + API
# Falhas/timeout de migração NÃO impedem a API de subir (evita unhealthy → 502).
set -uo pipefail

log() { echo "[vitalink-entrypoint] $*"; }

DB_HOST="${DB_HOST:-vitalink-db}"
DB_PORT="${DB_PORT:-5432}"
DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-45}"
DB_PREPARE_TIMEOUT_SEC="${DB_PREPARE_TIMEOUT_SEC:-90}"

wait_for_pg_tcp() {
  local i=1
  log "Aguardando PostgreSQL em ${DB_HOST}:${DB_PORT} (Node net)..."
  while (( i <= DB_WAIT_RETRIES )); do
    if DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" node -e "
      const net = require('net');
      const host = process.env.DB_HOST || 'vitalink-db';
      const port = Number(process.env.DB_PORT || 5432);
      const socket = net.connect({ host, port }, () => {
        socket.end();
        process.exit(0);
      });
      socket.setTimeout(2500, () => { socket.destroy(); process.exit(1); });
      socket.on('error', () => process.exit(1));
    "; then
      log "PostgreSQL pronto (TCP)."
      return 0
    fi
    log "Aguardando PostgreSQL em ${DB_HOST}:${DB_PORT}... (${i}/${DB_WAIT_RETRIES})"
    sleep 2
    (( ++i ))
  done
  log "ERRO: PostgreSQL não respondeu a tempo em ${DB_HOST}:${DB_PORT}."
  return 1
}

if ! wait_for_pg_tcp; then
  log "AVISO: seguindo sem confirmação TCP — a API ainda tentará conectar."
fi

log "Preparando schema/migrações (timeout ${DB_PREPARE_TIMEOUT_SEC}s)..."
set +e
if command -v timeout >/dev/null 2>&1; then
  timeout "${DB_PREPARE_TIMEOUT_SEC}" node /app/src/scripts/db-prepare.js
  prepare_rc=$?
  if (( prepare_rc == 124 )); then
    log "AVISO: db-prepare excedeu ${DB_PREPARE_TIMEOUT_SEC}s — iniciando API mesmo assim."
  elif (( prepare_rc != 0 )); then
    log "AVISO: db-prepare falhou (rc=${prepare_rc}) — iniciando API mesmo assim."
  else
    log "db-prepare OK."
  fi
else
  node /app/src/scripts/db-prepare.js
  prepare_rc=$?
  if (( prepare_rc != 0 )); then
    log "AVISO: db-prepare falhou (rc=${prepare_rc}) — iniciando API mesmo assim."
  else
    log "db-prepare OK."
  fi
fi
set -e

log "Iniciando API: $*"
exec "$@"
