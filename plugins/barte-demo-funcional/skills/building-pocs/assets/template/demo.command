#!/usr/bin/env bash
# Double-click in Finder: macOS opens this file in Terminal and runs it.
# `.command` exists only for that — the content is one line, and the truth about
# how the demo comes up stays in scripts/start.sh.
cd "$(dirname "$0")" && exec ./scripts/start.sh
