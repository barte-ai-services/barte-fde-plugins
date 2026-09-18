#!/usr/bin/env bash
# Cria uma demo nova a partir do template desta skill.
#
#   nova-demo.sh <pasta> "<Nome do Cliente>" [--nuvem aws|gcp|azure]
#
# O que ele faz, e nada além: copia o template, escreve o nome do cliente nos
# três lugares onde ele aparece, escolhe a nuvem e instala as dependências. O
# resto — dados do cliente, regras do agente, telas — é trabalho de quem está
# conduzindo a conversa, com a SKILL.md na mão.
set -euo pipefail

PASTA=${1:-}
CLIENTE=${2:-}
NUVEM=aws

shift 2 2>/dev/null || true
while [ $# -gt 0 ]; do
  case "$1" in
    --nuvem) NUVEM=${2:-aws}; shift 2 ;;
    *) echo "opção desconhecida: $1"; exit 2 ;;
  esac
done

if [ -z "$PASTA" ] || [ -z "$CLIENTE" ]; then
  echo "uso: nova-demo.sh <pasta> \"<Nome do Cliente>\" [--nuvem aws|gcp|azure]"
  exit 2
fi

case "$NUVEM" in
  aws|gcp|azure) ;;
  *) echo "nuvem inválida: $NUVEM (use aws, gcp ou azure)"; exit 2 ;;
esac

# `-e` porque uma pasta que já existe pode ter uma demo dentro, e sobrescrever
# silenciosamente o trabalho de ontem é o pior desfecho possível deste script.
if [ -e "$PASTA" ]; then
  echo "já existe: $PASTA"
  exit 1
fi

TEMPLATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../assets/template" && pwd)"
mkdir -p "$PASTA"
cp -R "$TEMPLATE/." "$PASTA/"
cd "$PASTA"

# O nome do cliente aparece em três lugares, e só nestes três. Se algum dia
# aparecer num quarto, esta lista é o lugar de registrar.
python3 - "$CLIENTE" <<'PY'
import re, sys, pathlib
cliente = sys.argv[1]
sigla = "".join(p[0] for p in cliente.split()[:2]).upper() or "CD"

# A sigla é trocada por EXPRESSÃO, e não por texto: no JSX ela fica sozinha numa
# linha, entre o `>` e o `</span>` do bloco do avatar, com a indentação no meio.
# Procurar a string ">CD<" não casa com nada e sai calado — que foi exatamente o
# que aconteceu na primeira versão deste script.
alvos = {
    "apps/web/app/layout.tsx": [("Barte · Demo · Contas a Pagar", f"Barte · {cliente} · Contas a Pagar")],
    "apps/web/components/layout/AppSidebar.tsx": [("Cliente Demo", cliente)],
    "apps/web/components/layout/Topbar.tsx": [("Cliente Demo", cliente)],
}
for caminho, trocas in alvos.items():
    arquivo = pathlib.Path(caminho)
    texto = arquivo.read_text()
    for de, para in trocas:
        texto = texto.replace(de, para)
    arquivo.write_text(texto)

avatar = pathlib.Path("apps/web/components/layout/AppSidebar.tsx")
texto = avatar.read_text()
novo, trocas = re.subn(r">\s*\n\s*CD\n(\s*)</span>", f">\n            {sigla}\n\\1</span>", texto)
if trocas != 1:
    raise SystemExit("não achei a sigla do avatar em AppSidebar.tsx — o template mudou de forma")
avatar.write_text(novo)
PY

cp .env.example .env
# `sed -i ''` é a forma do BSD (macOS); no GNU seria `sed -i`. Como a demo nasce
# no Mac de quem apresenta, esta é a que vale — e o arquivo temporário evita
# depender de qualquer uma das duas.
python3 - "$NUVEM" <<'PY'
import sys, pathlib
p = pathlib.Path(".env")
p.write_text(p.read_text().replace("NUVEM=aws", f"NUVEM={sys.argv[1]}", 1))
PY

echo "instalando dependências…"
npm install --silent

# Os pacotes do provedor entram SÓ na nuvem escolhida: uma demo AWS não carrega
# os SDKs do Google e da Microsoft, e vice-versa.
case "$NUVEM" in
  gcp)   npm install --silent --workspace @demo/api @google-cloud/storage @google-cloud/pubsub ;;
  azure) npm install --silent --workspace @demo/api @azure/storage-blob @azure/storage-queue ;;
esac

git init -q 2>/dev/null && git add -A && git commit -qm "demo $CLIENTE a partir do template" 2>/dev/null || true

cat <<FIM

demo criada em $PASTA  (nuvem: $NUVEM, cliente: $CLIENTE)

  cd $PASTA && ./scripts/subir.sh     sobe tudo e abre o navegador
  make verificar                      antes de apresentar

próximo passo: troque os dados de dados/ pelos do cliente.
FIM
