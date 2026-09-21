#!/usr/bin/env bash
# Reads the machine and reports what a Barte FDE setup still needs.
# Read-only: it installs nothing and changes nothing. Safe to run any time.
#
#   bash doctor.sh
#
# Output is Brazilian Portuguese because a human reads it. Identifiers are
# English, same split as the rest of the repository.

set -uo pipefail

ok=0; warn=0; bad=0

green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }
dim() { printf '\033[2m%s\033[0m' "$1"; }

row() { # row <state> <name> <detail>
  case "$1" in
    ok)   printf '  %s  %-24s %s\n' "$(green ✔)" "$2" "$(dim "$3")"; ok=$((ok+1)) ;;
    warn) printf '  %s  %-24s %s\n' "$(yellow ▲)" "$2" "$3"; warn=$((warn+1)) ;;
    bad)  printf '  %s  %-24s %s\n' "$(red ✗)" "$2" "$3"; bad=$((bad+1)) ;;
  esac
}

have() { command -v "$1" >/dev/null 2>&1; }

echo
echo "  Diagnóstico da máquina — Barte AI Services"
echo "  ─────────────────────────────────────────"
echo
echo "  Base"

if [ "$(uname -s)" = "Darwin" ]; then
  row ok "macOS" "$(sw_vers -productVersion 2>/dev/null) ($(uname -m))"
else
  row warn "sistema" "esta skill cobre só macOS — aqui é $(uname -s)"
fi

if xcode-select -p >/dev/null 2>&1; then
  row ok "ferramentas Xcode" "$(xcode-select -p)"
else
  row bad "ferramentas Xcode" "faltando — rode: xcode-select --install"
fi

if have brew; then
  row ok "Homebrew" "$(brew --version 2>/dev/null | head -1)"
else
  row bad "Homebrew" "faltando — é o instalador de todo o resto"
fi

if have git; then
  name=$(git config --global user.name 2>/dev/null || true)
  email=$(git config --global user.email 2>/dev/null || true)
  row ok "git" "$(git --version | awk '{print $3}')"
  if [ -z "$name" ] || [ -z "$email" ]; then
    row bad "identidade do git" "sem nome ou e-mail configurado"
  elif [[ "$email" != *"@barte.com" ]]; then
    row warn "identidade do git" "$email — o esperado é um e-mail @barte.com"
  else
    row ok "identidade do git" "$name <$email>"
  fi
else
  row bad "git" "faltando"
fi

have make && row ok "make" "$(make --version 2>/dev/null | head -1 | awk '{print $NF}')" \
          || row bad "make" "faltando — vem junto das ferramentas Xcode"

echo
echo "  Trabalho"

if have gh; then
  row ok "GitHub CLI" "$(gh --version 2>/dev/null | head -1 | awk '{print $3}')"
  if gh auth status >/dev/null 2>&1; then
    who=$(gh api user --jq .login 2>/dev/null || echo "?")
    row ok "login no GitHub" "conectado como $who"
    n=$(gh repo list barte-ai-services --limit 100 --json name 2>/dev/null | tr ',' '\n' | grep -c '"name"' || true)
    if [ "${n:-0}" -gt 0 ]; then
      row ok "acesso barte-ai-services" "$n repositórios visíveis"
    else
      row bad "acesso barte-ai-services" "login ok, mas nenhum repositório — falta aceitar o convite da organização"
    fi
  else
    row bad "login no GitHub" "não autenticado — rode: gh auth login"
  fi
else
  row bad "GitHub CLI" "faltando — instale com: brew install gh"
fi

if have node; then
  major=$(node --version | sed 's/^v//' | cut -d. -f1)
  if [ "${major:-0}" -ge 20 ]; then
    row ok "Node" "$(node --version)"
  else
    row warn "Node" "$(node --version) — o template de demo precisa de 20 ou mais novo"
  fi
else
  row bad "Node" "faltando — instale com: brew install node"
fi

have npm && row ok "npm" "$(npm --version 2>/dev/null)" || row warn "npm" "faltando — normalmente vem com o Node"

if have python3; then
  row ok "Python" "$(python3 --version 2>&1 | awk '{print $2}')"
else
  row bad "Python" "faltando — instale com: brew install python"
fi

have uv && row ok "uv" "$(uv --version 2>/dev/null | awk '{print $2}')" \
        || row warn "uv" "faltando — é o que isola as dependências dos scripts (brew install uv)"

# The CLI and the desktop app are both valid installs; the app does not put
# `claude` on PATH, so checking only the command reports a false negative.
if have claude; then
  row ok "Claude Code" "$(claude --version 2>/dev/null | head -1)"
elif [ -d "/Applications/Claude.app" ]; then
  row ok "Claude Code" "app instalado (CLI fora do PATH)"
elif [ -d "$HOME/.claude" ]; then
  row warn "Claude Code" "já foi usado aqui, mas o comando não está no PATH"
else
  row bad "Claude Code" "faltando — é onde o trabalho acontece"
fi

echo
echo "  Plugins da Barte"

for s in barte-checkpoint-fde barte-demo-funcional barte-fde-setup; do
  if [ -e "$HOME/.claude/skills/$s" ]; then
    row ok "$s" "instalada"
  else
    row warn "$s" "não instalada"
  fi
done

echo
echo "  Contêineres"

# Podman is the engine; the `docker` command here is just the client CLI talking
# to it over a Docker-compatible socket, which is what the demo Makefile calls.
if have podman; then
  row ok "Podman" "$(podman --version 2>/dev/null | awk '{print $3}')"
else
  row bad "Podman" "faltando — instale com: brew install podman"
fi

have docker && row ok "cliente docker" "$(docker --version 2>/dev/null | awk '{print $3}' | tr -d ,)" \
            || row bad "cliente docker" "faltando — instale com: brew install docker docker-compose"

if docker compose version >/dev/null 2>&1; then
  row ok "docker compose" "$(docker compose version --short 2>/dev/null)"
else
  row bad "docker compose" "faltando — é o que o Makefile da demo chama"
fi

if [ -n "${DOCKER_HOST:-}" ]; then
  row ok "DOCKER_HOST" "apontando para o Podman"
else
  row warn "DOCKER_HOST" "não definido — o cliente docker pode não achar o Podman"
fi

# The check that actually matters: everything above can be installed and the
# engine still not answer.
if docker ps >/dev/null 2>&1; then
  row ok "docker ps" "o engine respondeu"
else
  row bad "docker ps" "sem resposta do engine — rode: podman machine start"
fi

echo
echo "  ─────────────────────────────────────────"
printf '  %s pronto   %s atenção   %s faltando\n' "$(green "$ok")" "$(yellow "$warn")" "$(red "$bad")"
echo
if [ "$bad" -gt 0 ]; then
  echo "  Os itens em vermelho impedem o trabalho. Peça ajuda a quem está"
  echo "  conduzindo o setup — não precisa resolver sozinho."
  echo
fi
echo "  Os conectores (Fireflies, Granola, Drive, Slack, Notion) não aparecem"
echo "  aqui: confira com /mcp dentro do Claude."
echo

[ "$bad" -eq 0 ]
