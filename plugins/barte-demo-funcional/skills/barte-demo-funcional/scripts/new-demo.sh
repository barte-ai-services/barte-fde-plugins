#!/usr/bin/env bash
# Creates a new demo from this skill's template.
#
#   new-demo.sh <folder> "<Client Name>" [--cloud aws|gcp|azure]
#
# What it does, and nothing more: copies the template, writes the client's name
# into the demo's vocabulary, picks the cloud and installs dependencies. The rest
# — the client's data, the agent's rules, the screens — is the work of whoever is
# running the conversation, with SKILL.md at hand.
set -euo pipefail

FOLDER=${1:-}
CLIENT=${2:-}
CLOUD=aws

shift 2 2>/dev/null || true
while [ $# -gt 0 ]; do
  case "$1" in
    --cloud) CLOUD=${2:-aws}; shift 2 ;;
    *) echo "unknown option: $1"; exit 2 ;;
  esac
done

if [ -z "$FOLDER" ] || [ -z "$CLIENT" ]; then
  echo "usage: new-demo.sh <folder> \"<Client Name>\" [--cloud aws|gcp|azure]"
  exit 2
fi

case "$CLOUD" in
  aws|gcp|azure) ;;
  *) echo "invalid cloud: $CLOUD (use aws, gcp or azure)"; exit 2 ;;
esac

# `-e` because an existing folder may hold a demo, and silently overwriting
# yesterday's work is the worst possible outcome for this script.
if [ -e "$FOLDER" ]; then
  echo "already exists: $FOLDER"
  exit 1
fi

TEMPLATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../assets/template" && pwd)"
mkdir -p "$FOLDER"
cp -R "$TEMPLATE/." "$FOLDER/"
cd "$FOLDER"

# The client's name lives in ONE place: the flow's vocabulary. The screen reads it
# from there — sidebar, breadcrumb, avatar initials and tab title — so this script
# no longer edits JSX, and whoever is presenting can rename the client mid-meeting
# from the panel.
python3 - "$CLIENT" <<'PY'
import pathlib, sys
client = sys.argv[1]
p = pathlib.Path("data/flow.yaml")
text = p.read_text()
if "  client: Cliente Demo" not in text:
    raise SystemExit("could not find the client line in data/flow.yaml — the template changed shape")
p.write_text(text.replace("  client: Cliente Demo", f"  client: {client}", 1))
PY

cp .env.example .env
python3 - "$CLOUD" <<'PY'
import pathlib, sys
p = pathlib.Path(".env")
p.write_text(p.read_text().replace("CLOUD=aws", f"CLOUD={sys.argv[1]}", 1))
PY

echo "installing dependencies…"
npm install --silent

# Provider packages are installed ONLY for the chosen cloud: an AWS demo does not
# carry Google's and Microsoft's SDKs, and vice versa.
case "$CLOUD" in
  gcp)   npm install --silent --workspace @demo/api @google-cloud/storage @google-cloud/pubsub ;;
  azure) npm install --silent --workspace @demo/api @azure/storage-blob @azure/storage-queue ;;
esac

git init -q 2>/dev/null && git add -A && git commit -qm "demo for $CLIENT from the template" 2>/dev/null || true

cat <<END

demo created in $FOLDER  (cloud: $CLOUD, client: $CLIENT)

  cd $FOLDER && ./scripts/start.sh     brings it up and opens the browser
  make check                           before presenting

next step: replace the files in data/ with the client's own.
END
