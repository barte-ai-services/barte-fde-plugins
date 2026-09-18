#!/usr/bin/env bash
# O que se roda ANTES da reunião, não depois.
#
# Metade das verificações é de BACKEND e metade é de TELA, e a segunda metade
# existe porque o modo mais constrangedor de uma demo falhar não é ficar fora do
# ar: é abrir com o CSS sem carregar, ou com a página inerte — a tela aparece,
# parece certa, e nada responde ao clique. Isso não sai no log nem no console do
# navegador (o aviso de origem bloqueada sai no log do `next dev`, onde ninguém
# olha), então é conferido aqui, de fora, como o cliente veria.
#
# Cada linha é uma chamada de verdade. Sai diferente de zero se alguma falhar.
set -uo pipefail

API=${API_URL:-http://127.0.0.1:${API:-8080}/api}
WEB=${WEB_URL:-http://127.0.0.1:${WEB:-3000}}
AWS=${AWS_ENDPOINT_URL:-http://127.0.0.1:${AWS:-4566}}
falhas=0

checar() {
  local nome=$1 comando=$2
  if eval "$comando" >/dev/null 2>&1; then
    printf "  ok     %s\n" "$nome"
  else
    printf "  FALHA  %s\n" "$nome"
    falhas=$((falhas + 1))
  fi
}

echo "infraestrutura"
checar "emulador AWS responde"     "curl -sf $AWS/_localstack/health"
checar "api responde"              "curl -sf $API/saude"
checar "todas as peças de pé"      "! curl -sf $API/saude | grep -q '\"ok\":false'"
checar "esteira tem documentos"    "test \"\$(curl -sf $API/itens | grep -o '\"id\"' | wc -l)\" -gt 0"
checar "telemetria registrando"    "curl -sf $API/telemetria | grep -q '\"chamadas\"'"

echo
echo "tela"
checar "a página responde"         "curl -sf $WEB/esteira"
HTML=$(curl -sf "$WEB/esteira" 2>/dev/null || true)
# A folha do design system é o que traz Inter, as cores da marca e o estilo dos
# componentes. Sem ela a página abre em Times New Roman — e é uma tela que
# ninguém mostra a cliente.
# TODAS as folhas, e não a primeira: em desenvolvimento o Next serve o CSS em
# vários arquivos e a ordem não é estável, então checar só a primeira reprova
# uma página perfeitamente saudável.
CSS=$(printf '%s' "$HTML" | grep -oE '/_next/static/[^"]+\.css' | sort -u)
checar "a folha de estilo existe"  "test -n \"$CSS\""
# O conteúdo vai para uma VARIÁVEL antes do grep, e não direto num cano. Com
# `pipefail` ligado, `curl … | grep -q` reprova a verificação mesmo quando a cor
# está lá: o `-q` fecha o cano no primeiro acerto, o curl morre de SIGPIPE, e o
# status do PIPELINE é o do curl. Passa a folha inteira pela memória — são
# poucos KB — e o grep decide sozinho.
marca=1
for folha in $CSS; do
  conteudo=$(curl -sf "$WEB$folha" || true)
  case "$conteudo" in
    *df285d* | *DF285D*) marca=0; break ;;
  esac
done
checar "o design system carregou (cor da marca na folha)" "test $marca -eq 0"
checar "o app hidrata (JS servido)" "printf '%s' \"\$HTML\" | grep -q '_next/static/chunks'"
checar "a marca está na página"    "printf '%s' \"\$HTML\" | grep -qi 'barte'"

echo
if [ "$falhas" -eq 0 ]; then
  echo "tudo de pé."
  echo
  echo "antes de apresentar, faça UMA passada com os próprios olhos:"
  echo "  1. abra $WEB e execute a esteira inteira uma vez"
  echo "  2. abra um item com exceção e leia a trilha de decisões"
  echo "  3. abra 'A stack desta demo' no rodapé e veja as chamadas ao vivo"
  echo "  4. estreite a janela até a largura do notebook que vai projetar"
else
  echo "$falhas verificação(ões) falharam — não apresente assim."
fi
exit "$falhas"
