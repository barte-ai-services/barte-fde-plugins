#!/usr/bin/env bash
# Brings the whole demo up and opens the browser. This is the one-command path.
#
# Three decisions that exist so the demo opens on anyone's machine, not just on
# the machine that built it:
#
#   1. Ports are CHOSEN, not fixed. 3000, 8080 and 4566 are the most contested
#      ports there are — 4566 is the gatekeeper's, and whoever runs both loses the
#      demo to "port is already allocated" thirty seconds before the meeting. Here
#      the first free port wins and everyone (compose, API, web, browser) reads
#      the same number from here.
#   2. It waits for each piece to ANSWER before moving on, from outside the
#      container. A healthcheck runs inside and passes even when the published
#      port answers nobody.
#   3. It only opens the browser once the screen answers — opening earlier shows
#      the client a connection error, which is the first thing they would see.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT=$PWD

# The Compose project name comes from the FOLDER. Two demos open at once under the
# same name share containers and volumes — and bringing the second one up would
# recreate the first one's database.
export DEMO_NAME=$(basename "$ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-' | sed 's/-*$//')

free() { # first free port starting at $1
  local p=$1
  while lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; do p=$((p + 1)); done
  echo "$p"
}

wait_for() { # url, seconds
  local url=$1 limit=${2:-90} i=0
  until curl -sf -o /dev/null "$url"; do
    i=$((i + 1))
    [ "$i" -ge "$limit" ] && { echo "  no answer from: $url"; return 1; }
    sleep 1
  done
}

# The cloud comes from `.env` and decides which compose profile comes up.
[ -f .env ] || cp .env.example .env
CLOUD=${CLOUD:-$(grep -E '^CLOUD=' .env | tail -1 | cut -d= -f2 | tr -d '[:space:]')}
CLOUD=${CLOUD:-aws}

WEB=${WEB:-$(free 3000)}
API=${API:-$(free 8080)}
AWS=${AWS:-$(free 4566)}
PG=${PG:-$(free 5432)}
GCS=${GCS:-$(free 4443)}
PUBSUB=${PUBSUB:-$(free 8085)}
AZ_BLOB=${AZ_BLOB:-$(free 10000)}
AZ_QUEUE=${AZ_QUEUE:-$(free 10001)}

set -a; . ./.env; set +a
# `.env` does not get to decide the ports: the lines below do, because they know
# what is free NOW. Re-exporting after sourcing is what guarantees that.
export CLOUD PG_PORT=$PG AWS_LOCAL_PORT=$AWS GCS_PORT=$GCS PUBSUB_PORT=$PUBSUB
export AZURITE_BLOB_PORT=$AZ_BLOB AZURITE_QUEUE_PORT=$AZ_QUEUE
export API_PORT=$API WEB_ORIGIN=http://127.0.0.1:$WEB NEXT_PUBLIC_API=http://127.0.0.1:$API/api

[ -d node_modules ] || { echo "installing dependencies (this time only)…"; npm install; }

echo "▸ cloud         $CLOUD"
COMPOSE="docker compose --project-directory infra/compose -f infra/compose/compose.yml --profile $CLOUD"
$COMPOSE up -d --wait >/dev/null

# The ports chosen above hold for the FIRST run. From the second on, this demo's
# containers are already up — which is exactly what `free` sees as "taken", so it
# would point the application at a port where nobody listens, and the API would
# die on a 404 that says nothing about ports. Compose knows the published port, so
# once everything is up, Compose is who answers.
published() { # service, internal port
  $COMPOSE port "$1" "$2" 2>/dev/null | sed 's/.*://' | tr -d '[:space:]'
}

PG=$(published postgres 5432)
case "$CLOUD" in
  aws)   AWS=$(published floci 4566) ;;
  gcp)   GCS=$(published gcs 4443); PUBSUB=$(published pubsub 8085) ;;
  azure) AZ_BLOB=$(published azurite 10000); AZ_QUEUE=$(published azurite 10001) ;;
esac

export DATABASE_URL=postgres://demo:demo@127.0.0.1:$PG/demo
export AWS_ENDPOINT_URL=http://127.0.0.1:$AWS
export STORAGE_EMULATOR_HOST=http://127.0.0.1:$GCS
export PUBSUB_EMULATOR_HOST=127.0.0.1:$PUBSUB
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:$AZ_BLOB/devstoreaccount1;QueueEndpoint=http://127.0.0.1:$AZ_QUEUE/devstoreaccount1"

echo "▸ postgres      :$PG"
case "$CLOUD" in
  aws)   echo "▸ floci         :$AWS" ;;
  gcp)   echo "▸ gcs           :$GCS"
         echo "▸ pubsub        :$PUBSUB" ;;
  azure) echo "▸ azurite       :$AZ_BLOB and :$AZ_QUEUE" ;;
esac

mkdir -p .logs
echo "▸ api           :$API"
(cd apps/api && npm run dev > "$ROOT/.logs/api.log" 2>&1) &
API_PID=$!
echo "▸ web           :$WEB"
(cd apps/web && npm run dev -- -p "$WEB" > "$ROOT/.logs/web.log" 2>&1) &
WEB_PID=$!

shutdown() {
  echo
  echo "stopping… (containers stay up; \`make down\` stops them)"
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

wait_for "http://127.0.0.1:$API/api/health" 120 || { echo "see .logs/api.log"; exit 1; }
wait_for "http://127.0.0.1:$WEB/pipeline" 120 || { echo "see .logs/web.log"; exit 1; }

echo
echo "  demo up      http://127.0.0.1:$WEB"
echo "  api          http://127.0.0.1:$API/api"
echo "  logs         .logs/api.log  .logs/web.log"
echo
echo "  Ctrl-C stops it."

[ "${OPEN:-1}" = "1" ] && command -v open >/dev/null && open "http://127.0.0.1:$WEB"

wait
