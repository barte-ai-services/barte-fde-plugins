# A demo local. Tudo aqui é `docker compose` mais dois processos Node — o
# Makefile é atalho, não uma segunda verdade sobre como ela sobe.
#
# Portas trocáveis porque 3000 e 8080 são as mais disputadas que existem:
#
#   make up WEB=3001 API=18080 AWS=14566
#
# AWS=4566 colide com qualquer outro emulador da máquina — o gatekeeper publica
# nessa porta. A troca vale para o contêiner E para os dois processos Node, que
# leem o mesmo número daqui.

COMPOSE := docker compose --project-directory infra/compose -f infra/compose/compose.yml

WEB ?= 3000
API ?= 8080
AWS ?= 4566
PG  ?= 5432
export API_PORTA = $(API)
export WEB_ORIGEM = http://127.0.0.1:$(WEB)
export NEXT_PUBLIC_API = http://127.0.0.1:$(API)/api
export AWS_LOCAL_PORT = $(AWS)
export AWS_ENDPOINT_URL = http://127.0.0.1:$(AWS)
export PG_PORT = $(PG)
export DATABASE_URL = postgres://demo:demo@127.0.0.1:$(PG)/demo

.DEFAULT_GOAL := help
.PHONY: help demo up down clean logs dev build verificar

help:  ## Mostra estes alvos
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN{FS=":.*?## "};{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  web  http://127.0.0.1:$(WEB)"
	@echo "  api  http://127.0.0.1:$(API)/api"
	@echo "  aws  http://127.0.0.1:$(AWS)"

demo: ## Sobe tudo e abre no navegador — é ISTO que você roda
	@./scripts/subir.sh

up: ## Só o emulador, semeia e deixa pronto para `make dev`
	@test -f .env || cp .env.example .env
	$(COMPOSE) up -d --wait
	@echo "emulador de pé. agora: make dev"

down: ## Derruba o emulador preservando o que o agente já decidiu
	$(COMPOSE) down

clean: ## Derruba e apaga os volumes — a esteira volta ao estado inicial
	$(COMPOSE) down -v

logs: ## Segue o emulador
	$(COMPOSE) logs -f

dev: ## Roda API e web juntos (Ctrl-C derruba os dois)
	@set -a; . ./.env; set +a; \
	  (cd apps/api && npm run dev) & \
	  (cd apps/web && npm run dev -- -p $(WEB)) & \
	  wait

build: ## Compila os dois — é o que o CI rodaria
	npm run build --workspaces --if-present

verificar: ## Confere que a demo está inteira antes de mostrá-la
	@bash scripts/verificar.sh
