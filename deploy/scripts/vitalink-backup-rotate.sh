#!/usr/bin/env bash
# Rotação dos backups manuais do VitaLink (pg_dump antes de deploy) — retenção máxima de 30 dias.
# Só toca em diretórios /root/backups/vitalink-* (nunca em backups de outros apps).
# Uso: vitalink-backup-rotate.sh [--dry-run]     Instalação: ver docs/DEPLOY_SECURITY.md
set -euo pipefail
BASE=/root/backups
DIAS=${VITALINK_BACKUP_DIAS:-30}
LOG=${VITALINK_BACKUP_LOG:-/var/log/vitalink-backup-rotate.log}
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1
log() { echo "$(date '+%F %T %z') $*" | tee -a "$LOG"; }

[[ -d "$BASE" ]] || { log "base $BASE inexistente; nada a fazer"; exit 0; }
log "início (dry_run=$DRY, retenção=${DIAS}d)"
n=0
while IFS= read -r -d '' dir; do
  real=$(realpath -e "$dir")
  case "$real" in
    "$BASE"/vitalink-*) ;;
    *) log "IGNORADO (fora do padrão): $real"; continue ;;
  esac
  idade=$(( ( $(date +%s) - $(stat -c %Y "$real") ) / 86400 ))
  if (( DRY )); then
    log "APAGARIA: $real (${idade}d)"
  else
    rm -rf -- "$real"
    log "APAGADO: $real (${idade}d)"
  fi
  n=$((n + 1))
done < <(find "$BASE" -mindepth 1 -maxdepth 1 -type d -name 'vitalink-*' -mmin +$((DIAS * 1440)) -print0)
log "fim: $n diretório(s) $([[ $DRY == 1 ]] && echo 'seriam apagados' || echo 'apagados')"
