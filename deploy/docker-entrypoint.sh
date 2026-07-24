#!/usr/bin/env bash
# VitaLink backend entrypoint — wait MySQL (Node net puro) + prepare + API
# Sem dependência de nc/mysqladmin (imagem node:alpine).
set -uo pipefail

log() { echo "[vitalink-entrypoint] $*"; }

DB_HOST="${DB_HOST:-vitalink-db}"
DB_PORT="${DB_PORT:-3306}"
DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-90}"

wait_for_mysql_tcp() {
  local i=1
  log "Aguardando MySQL em ${DB_HOST}:${DB_PORT} (Node net)..."
  while (( i <= DB_WAIT_RETRIES )); do
    if DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" node -e "
      const net = require('net');
      const host = process.env.DB_HOST || 'vitalink-db';
      const port = Number(process.env.DB_PORT || 3306);
      const socket = net.connect({ host, port }, () => {
        socket.end();
        process.exit(0);
      });
      socket.setTimeout(3000, () => { socket.destroy(); process.exit(1); });
      socket.on('error', () => process.exit(1));
    "; then
      log "MySQL pronto! Iniciando preparação da aplicação..."
      return 0
    fi
    log "Aguardando MySQL em ${DB_HOST}:${DB_PORT}... (${i}/${DB_WAIT_RETRIES})"
    sleep 2
    (( ++i ))
  done
  log "ERRO: MySQL não respondeu a tempo em ${DB_HOST}:${DB_PORT}."
  return 1
}

if ! wait_for_mysql_tcp; then
  exit 1
fi

log "Preparando schema/migrações (mysql2)..."
if ! node /app/src/scripts/db-prepare.js; then
  # Evita crash-loop/502: sobe a API mesmo se migração/auth falhar
  log "AVISO: db-prepare falhou — iniciando API mesmo assim."
fi

log "Iniciando API: $*"
exec "$@"
