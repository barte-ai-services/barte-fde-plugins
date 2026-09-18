#!/usr/bin/env bash
# Dois cliques no Finder: o macOS abre este arquivo no Terminal e roda.
# `.command` existe só para isso — o conteúdo é uma linha, e a verdade sobre
# como a demo sobe continua em scripts/subir.sh.
cd "$(dirname "$0")" && exec ./scripts/subir.sh
