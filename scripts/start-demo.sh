#!/usr/bin/env bash
# Start the whole T1D India demo stack.
#
# Ports on this machine:
#   3000 - taken by an unrelated Docker project, so the API uses 3002.
#   3001 - web app
#   8000 - ML inference service (optional)
#
# Usage: ./scripts/start-demo.sh [--with-ml]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-3002}"
WEB_PORT="${WEB_PORT:-3001}"
ML_PORT="${ML_PORT:-8000}"
WITH_ML="false"
[[ "${1:-}" == "--with-ml" ]] && WITH_ML="true"

log() { printf '\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$1"; }

cleanup() {
  log "Shutting down..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
  [[ -n "${ML_PID:-}" ]] && kill "$ML_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- infra ---------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q '^t1d-postgres$'; then
  log "Starting Postgres + Redis (docker)..."
  docker compose -f "$ROOT/infrastructure/docker/docker-compose.yml" up -d postgres redis
else
  log "Postgres + Redis already running"
fi

# --- database ------------------------------------------------------------
log "Applying Prisma schema + demo data..."
(cd "$ROOT" && npx prisma db push --skip-generate >/dev/null 2>&1 || true)
(cd "$ROOT" && npx tsx scripts/seed-demo.ts)

# --- API -----------------------------------------------------------------
log "Starting API on :$API_PORT"
(cd "$ROOT/apps/api" && PORT="$API_PORT" npx tsx src/index.ts >"$ROOT/.demo-api.log" 2>&1) &
API_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$API_PORT/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -sf "http://localhost:$API_PORT/health" >/dev/null || { log "API failed to start; see .demo-api.log"; exit 1; }
log "API healthy"

# --- ML (optional) -------------------------------------------------------
if [[ "$WITH_ML" == "true" ]]; then
  if [[ -x "$ROOT/apps/ml-service/.venv/bin/uvicorn" ]]; then
    log "Starting ML service on :$ML_PORT"
    (cd "$ROOT/apps/ml-service" && ./.venv/bin/uvicorn src.main:app --host 0.0.0.0 --port "$ML_PORT" >"$ROOT/.demo-ml.log" 2>&1) &
    ML_PID=$!
  else
    log "ML venv missing - run: cd apps/ml-service && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt"
  fi
fi

# --- web -----------------------------------------------------------------
log "Starting web app on :$WEB_PORT"
(cd "$ROOT/apps/web" && NEXT_PUBLIC_API_URL="http://localhost:$API_PORT" PORT="$WEB_PORT" npx next dev >"$ROOT/.demo-web.log" 2>&1) &
WEB_PID=$!

for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$WEB_PORT/dashboard" >/dev/null 2>&1; then break; fi
  sleep 1
done

cat <<EOF

  T1D India demo is up
  --------------------
  Web app   http://localhost:$WEB_PORT/dashboard
  API       http://localhost:$API_PORT/health
  API docs  http://localhost:$API_PORT/documentation
$( [[ "$WITH_ML" == "true" ]] && echo "  ML        http://localhost:$ML_PORT/docs" )

  Logs: .demo-api.log / .demo-web.log
  Press Ctrl+C to stop everything.

EOF

wait
