# The local demo. Everything here is `docker compose` plus two Node processes —
# the Makefile is a shortcut, not a second truth about how it comes up.
#
# Ports are swappable because 3000, 8080 and 4566 are the most contested there
# are; 4566 in particular is the gatekeeper's, and running both would collide:
#
#   make demo WEB=3001 API=18080 AWS=14566

COMPOSE := docker compose --project-directory infra/compose -f infra/compose/compose.yml

WEB   ?= 3000
API   ?= 8080
AWS   ?= 4566
PG    ?= 5432
CLOUD ?= aws

export API_PORT = $(API)
export WEB_ORIGIN = http://127.0.0.1:$(WEB)
export NEXT_PUBLIC_API = http://127.0.0.1:$(API)/api
export AWS_LOCAL_PORT = $(AWS)
export AWS_ENDPOINT_URL = http://127.0.0.1:$(AWS)
export PG_PORT = $(PG)
export DATABASE_URL = postgres://demo:demo@127.0.0.1:$(PG)/demo

.DEFAULT_GOAL := help
.PHONY: help demo up down clean logs dev build check

help:  ## Show these targets
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN{FS=":.*?## "};{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  web  http://127.0.0.1:$(WEB)"
	@echo "  api  http://127.0.0.1:$(API)/api"

demo: ## Bring everything up and open the browser — THIS is what you run
	@./scripts/start.sh

up: ## Containers only (emulators + database)
	@test -f .env || cp .env.example .env
	$(COMPOSE) --profile $(CLOUD) up -d --wait

down: ## Stop the containers, keeping what the agent already decided
	$(COMPOSE) --profile $(CLOUD) down

clean: ## Stop and drop the volumes — the pipeline goes back to its initial state
	$(COMPOSE) --profile $(CLOUD) down -v

logs: ## Follow the containers
	$(COMPOSE) --profile $(CLOUD) logs -f

dev: ## Run API and web together (Ctrl-C stops both)
	@set -a; . ./.env; set +a; \
	  (cd apps/api && npm run dev) & \
	  (cd apps/web && npm run dev -- -p $(WEB)) & \
	  wait

build: ## Compile both — what CI would run
	npm run build --workspaces --if-present

check: ## Verify the demo is whole before showing it
	@bash scripts/check.sh
