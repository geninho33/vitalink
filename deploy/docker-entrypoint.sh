#!/usr/bin/env bash
# VitaLink backend entrypoint — aguarda MySQL, aplica migrações se necessário, sobe a API
set -euo pipefail

log() { echo "[vitalink-entrypoint] $*"; }

DB_HOST="${DB_HOST:-vitalink-db}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-vitalink}"
DB_PASSWORD="${DB_PASSWORD:-vitalink_secret}"
DB_NAME="${DB_NAME:-vitalink}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-masterkey}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"

MYSQL_OPTS=( -h"$DB_HOST" -P"$DB_PORT" -uroot "-p${DB_ROOT_PASSWORD}" --protocol=TCP )

wait_for_mysql() {
  local retries=90
  log "Aguardando MySQL em ${DB_HOST}:${DB_PORT}..."
  for ((i=1; i<=retries; i++)); do
    if mysqladmin ping "${MYSQL_OPTS[@]}" --silent 2>/dev/null; then
      log "MySQL disponível."
      return 0
    fi
    sleep 2
  done
  log "ERRO: MySQL não respondeu a tempo."
  exit 1
}

table_exists() {
  local count
  count="$(mysql "${MYSQL_OPTS[@]}" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='usuarios';" 2>/dev/null || echo 0)"
  [[ "$count" != "0" ]]
}

agenda_exists() {
  local count
  count="$(mysql "${MYSQL_OPTS[@]}" -N -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='agenda_eventos';" 2>/dev/null || echo 0)"
  [[ "$count" != "0" ]]
}

run_sql_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    log "AVISO: arquivo SQL não encontrado: $file"
    return 0
  fi
  log "Aplicando $(basename "$file")..."
  # Não aborta o container se o patch já tiver sido aplicado (ex.: ALTER duplicado)
  if ! mysql "${MYSQL_OPTS[@]}" --default-character-set=utf8mb4 < "$file"; then
    log "AVISO: falha ao aplicar $(basename "$file") — seguindo (pode já estar migrado)."
  fi
}

ensure_grants() {
  # Garante que o usuário da API acessa o schema a partir da rede Docker
  mysql "${MYSQL_OPTS[@]}" -e \
    "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
     ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
     GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
     FLUSH PRIVILEGES;" 2>/dev/null \
    || log "AVISO: não foi possível ajustar grants (seguindo)."
}

apply_migrations() {
  if [[ "$RUN_MIGRATIONS" != "true" ]]; then
    log "RUN_MIGRATIONS=false — pulando migrações."
    return 0
  fi

  ensure_grants

  if ! table_exists; then
    log "Schema base ausente — aplicando schema + patches..."
    run_sql_file /app/database/schema.sql
    run_sql_file /app/database/patch_saude_modulos.sql
    run_sql_file /app/database/patch_atividades_anamnese.sql
  elif ! agenda_exists; then
    log "Patches de atividades ausentes — aplicando..."
    run_sql_file /app/database/patch_saude_modulos.sql
    run_sql_file /app/database/patch_atividades_anamnese.sql
  else
    log "Banco já migrado (usuarios + agenda_eventos)."
  fi
}

wait_for_mysql
apply_migrations

log "Iniciando API: $*"
exec "$@"
