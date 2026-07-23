#!/usr/bin/env bash
# =============================================================================
# VitaLink — script de deploy (build, compose, migração e Git)
# Uso:
#   ./deploy.sh up          # build + sobe stack
#   ./deploy.sh down        # para e remove containers
#   ./deploy.sh rebuild     # rebuild sem cache + up
#   ./deploy.sh logs        # logs em follow
#   ./deploy.sh ps          # status
#   ./deploy.sh migrate     # reaplica SQL via backend entrypoint/restart
#   ./deploy.sh git-status  # status do repositório
#   ./deploy.sh git-push    # push da branch configurada (GIT_BRANCH)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[deploy] Criando deploy/.env a partir de .env.example..."
  cp "${SCRIPT_DIR}/.env.example" "$ENV_FILE"
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-dev}"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

cmd_up() {
  echo "[deploy] Build e subida da stack VitaLink..."
  echo "  DB host port:       ${VITALINK_DB_HOST_PORT:-3308}"
  echo "  Backend host port:  ${VITALINK_BACKEND_HOST_PORT:-3002}"
  echo "  Frontend host port: ${VITALINK_FRONTEND_HOST_PORT:-3102}"
  compose up -d --build
  echo "[deploy] OK."
  echo "  Frontend: http://localhost:${VITALINK_FRONTEND_HOST_PORT:-3102}"
  echo "  API:      http://localhost:${VITALINK_BACKEND_HOST_PORT:-3002}/health"
  echo "  MySQL:    localhost:${VITALINK_DB_HOST_PORT:-3308}"
}

cmd_down() {
  echo "[deploy] Parando stack..."
  compose down
}

cmd_rebuild() {
  echo "[deploy] Rebuild sem cache..."
  compose build --no-cache
  compose up -d
}

cmd_logs() {
  compose logs -f --tail=200
}

cmd_ps() {
  compose ps
}

cmd_migrate() {
  echo "[deploy] Forçando reexecução de migrações (restart backend)..."
  compose up -d vitalink-db
  compose restart vitalink-backend
  compose logs --tail=80 vitalink-backend
}

cmd_git_status() {
  git -C "$ROOT_DIR" status -sb
  git -C "$ROOT_DIR" remote -v
  git -C "$ROOT_DIR" log -3 --oneline
}

cmd_git_push() {
  echo "[deploy] Push para ${GIT_REMOTE}/${GIT_BRANCH}..."
  git -C "$ROOT_DIR" push -u "$GIT_REMOTE" "HEAD:${GIT_BRANCH}"
}

cmd_help() {
  sed -n '2,16p' "$0"
}

case "${1:-help}" in
  up) cmd_up ;;
  down) cmd_down ;;
  rebuild) cmd_rebuild ;;
  logs) cmd_logs ;;
  ps) cmd_ps ;;
  migrate) cmd_migrate ;;
  git-status) cmd_git_status ;;
  git-push) cmd_git_push ;;
  help|-h|--help) cmd_help ;;
  *)
    echo "Comando desconhecido: $1"
    cmd_help
    exit 1
    ;;
esac
