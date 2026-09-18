#!/usr/bin/env bash
# Sobe a demo inteira e abre o navegador. É o caminho de UM comando.
#
# Três decisões que existem para a demo abrir na máquina de qualquer um, e não
# só na de quem a construiu:
#
#   1. As portas são ESCOLHIDAS, não fixadas. 3000, 8080 e 4566 são as mais
#      disputadas que existem — 4566 é a mesma do gatekeeper, e quem tem os dois
#      de pé perde a demo por um "port is already allocated" trinta segundos
#      antes da reunião. Aqui a primeira porta livre vence e todo mundo (compose,
#      API, web, navegador) lê o mesmo número daqui.
#   2. Espera cada peça RESPONDER antes de seguir, de fora do contêiner. Um
#      healthcheck roda dentro e passa mesmo quando a porta publicada não atende.
#   3. Só abre o navegador depois que a tela responde — abrir antes mostra um
#      erro de conexão ao cliente, que é a primeira coisa que ele vê.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
RAIZ=$PWD

# O nome do projeto do Compose sai da PASTA. Duas demos abertas ao mesmo tempo
# com o mesmo nome dividem contêiner e volume — e subir a segunda recria o banco
# da primeira. Minúsculas, sem acento e sem pontuação porque é o que o Compose
# aceita num nome de projeto.
export DEMO_NOME=$(basename "$RAIZ" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_-' '-' | sed 's/-*$//')

livre() { # primeira porta livre a partir de $1
  local p=$1
  while lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; do p=$((p + 1)); done
  echo "$p"
}

esperar() { # url, segundos
  local url=$1 limite=${2:-90} i=0
  until curl -sf -o /dev/null "$url"; do
    i=$((i + 1))
    [ "$i" -ge "$limite" ] && { echo "  não respondeu: $url"; return 1; }
    sleep 1
  done
}

# A nuvem sai do `.env` e decide qual perfil do compose sobe. Lido ANTES do
# bloco que exporta as portas porque é ele que escolhe quais portas importam.
[ -f .env ] || cp .env.example .env
NUVEM=${NUVEM:-$(grep -E '^NUVEM=' .env | tail -1 | cut -d= -f2 | tr -d '[:space:]')}
NUVEM=${NUVEM:-aws}

WEB=${WEB:-$(livre 3000)}
API=${API:-$(livre 8080)}
AWS=${AWS:-$(livre 4566)}
PG=${PG:-$(livre 5432)}
GCS=${GCS:-$(livre 4443)}
PUBSUB=${PUBSUB:-$(livre 8085)}
AZ_BLOB=${AZ_BLOB:-$(livre 10000)}
AZ_FILA=${AZ_FILA:-$(livre 10001)}

export NUVEM
export GCS_PORT=$GCS PUBSUB_PORT=$PUBSUB
export AZURITE_BLOB_PORT=$AZ_BLOB AZURITE_QUEUE_PORT=$AZ_FILA
export STORAGE_EMULATOR_HOST=http://127.0.0.1:$GCS
export PUBSUB_EMULATOR_HOST=127.0.0.1:$PUBSUB
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:$AZ_BLOB/devstoreaccount1;QueueEndpoint=http://127.0.0.1:$AZ_FILA/devstoreaccount1"
export PG_PORT=$PG
export DATABASE_URL=postgres://demo:demo@127.0.0.1:$PG/demo
export AWS_LOCAL_PORT=$AWS
export AWS_ENDPOINT_URL=http://127.0.0.1:$AWS
export API_PORTA=$API
export WEB_ORIGEM=http://127.0.0.1:$WEB
export NEXT_PUBLIC_API=http://127.0.0.1:$API/api

set -a; . ./.env; set +a
# O .env não manda nas portas: quem manda é a linha acima, que já sabe o que
# está livre AGORA. Reexportar depois do `.env` é o que garante isso.
export AWS_LOCAL_PORT=$AWS AWS_ENDPOINT_URL=http://127.0.0.1:$AWS
export STORAGE_EMULATOR_HOST=http://127.0.0.1:$GCS PUBSUB_EMULATOR_HOST=127.0.0.1:$PUBSUB
export GCS_PORT=$GCS PUBSUB_PORT=$PUBSUB AZURITE_BLOB_PORT=$AZ_BLOB AZURITE_QUEUE_PORT=$AZ_FILA
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:$AZ_BLOB/devstoreaccount1;QueueEndpoint=http://127.0.0.1:$AZ_FILA/devstoreaccount1"
export NUVEM PG_PORT=$PG DATABASE_URL=postgres://demo:demo@127.0.0.1:$PG/demo
export API_PORTA=$API WEB_ORIGEM=http://127.0.0.1:$WEB NEXT_PUBLIC_API=http://127.0.0.1:$API/api

[ -d node_modules ] || { echo "instalando dependências (só desta vez)…"; npm install; }

echo "▸ nuvem         $NUVEM"
COMPOSE="docker compose --project-directory infra/compose -f infra/compose/compose.yml --profile $NUVEM"
$COMPOSE up -d --wait >/dev/null

# As portas escolhidas acima valem para a PRIMEIRA subida. Da segunda em diante
# os contêineres desta demo já estão de pé — e é justamente o que `livre` vê como
# "ocupado", então ela desviaria a aplicação para uma porta onde não há ninguém,
# com a API morrendo num 404 que não diz nada sobre portas. Quem sabe a porta
# publicada de verdade é o Compose; então, depois de subir, é ele quem responde.
publicada() { # serviço, porta interna
  $COMPOSE port "$1" "$2" 2>/dev/null | sed 's/.*://' | tr -d '[:space:]'
}

PG=$(publicada postgres 5432 || true); PG=${PG:-$PG}
case "$NUVEM" in
  aws)   AWS=$(publicada floci 4566) ;;
  gcp)   GCS=$(publicada gcs 4443); PUBSUB=$(publicada pubsub 8085) ;;
  azure) AZ_BLOB=$(publicada azurite 10000); AZ_FILA=$(publicada azurite 10001) ;;
esac

# E reexporta com os números reais — é isto que a API e a web vão ler.
export DATABASE_URL=postgres://demo:demo@127.0.0.1:$PG/demo
export AWS_ENDPOINT_URL=http://127.0.0.1:$AWS
export STORAGE_EMULATOR_HOST=http://127.0.0.1:$GCS
export PUBSUB_EMULATOR_HOST=127.0.0.1:$PUBSUB
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:$AZ_BLOB/devstoreaccount1;QueueEndpoint=http://127.0.0.1:$AZ_FILA/devstoreaccount1"

echo "▸ postgres      :$PG"
case "$NUVEM" in
  aws)   echo "▸ floci         :$AWS" ;;
  gcp)   echo "▸ gcs           :$GCS"
         echo "▸ pubsub        :$PUBSUB" ;;
  azure) echo "▸ azurite       :$AZ_BLOB e :$AZ_FILA" ;;
esac

mkdir -p .logs
echo "▸ api           :$API"
(cd apps/api && npm run dev > "$RAIZ/.logs/api.log" 2>&1) &
API_PID=$!
echo "▸ web           :$WEB"
(cd apps/web && npm run dev -- -p "$WEB" > "$RAIZ/.logs/web.log" 2>&1) &
WEB_PID=$!

encerrar() {
  echo
  echo "derrubando… (o emulador continua de pé; \`make down\` derruba)"
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap encerrar EXIT INT TERM

esperar "http://127.0.0.1:$API/api/saude" 120 || { echo "veja .logs/api.log"; exit 1; }
esperar "http://127.0.0.1:$WEB/esteira" 120 || { echo "veja .logs/web.log"; exit 1; }

echo
echo "  demo no ar   http://127.0.0.1:$WEB"
echo "  api          http://127.0.0.1:$API/api"
echo "  logs         .logs/api.log  .logs/web.log"
echo
echo "  Ctrl-C encerra."

[ "${ABRIR:-1}" = "1" ] && command -v open >/dev/null && open "http://127.0.0.1:$WEB"

wait
