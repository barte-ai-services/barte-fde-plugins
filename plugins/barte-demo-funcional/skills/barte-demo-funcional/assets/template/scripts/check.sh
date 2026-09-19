#!/usr/bin/env bash
# What you run BEFORE the meeting, not after.
#
# Half the checks are backend and half are screen, and the second half exists
# because the most embarrassing way for a demo to fail is not being down: it is
# opening with no CSS, or opening beautifully and being inert. That shows up
# neither in the log nor in the browser console (the blocked-origin warning lands
# in the `next dev` log, where nobody looks), so it is checked here, from the
# outside, the way the client would see it.
#
# Every line is a real call. Exits non-zero if any fails.
set -uo pipefail

API=${API_URL:-http://127.0.0.1:${API:-8080}/api}
WEB=${WEB_URL:-http://127.0.0.1:${WEB:-3000}}
failures=0

check() {
  local name=$1 command=$2
  if eval "$command" >/dev/null 2>&1; then
    printf "  ok     %s\n" "$name"
  else
    printf "  FAIL   %s\n" "$name"
    failures=$((failures + 1))
  fi
}

echo "infrastructure"
check "api answers"              "curl -sf $API/health"
check "every component up"       "! curl -sf $API/health | grep -q '\"ok\":false'"
check "pipeline has documents"   "test \"\$(curl -sf $API/items | grep -o '\"id\"' | wc -l)\" -gt 0"
check "flow is loaded"           "curl -sf $API/flow | grep -q '\"steps\"'"
check "telemetry is recording"   "curl -sf $API/telemetry | grep -q '\"calls\"'"

echo
echo "screen"
check "the page answers"         "curl -sf $WEB/pipeline"
HTML=$(curl -sf "$WEB/pipeline" 2>/dev/null || true)
# The design system stylesheet is what brings Inter, the brand colours and the
# component styling. Without it the page opens in Times New Roman — a screen
# nobody shows a client.
#
# ALL stylesheets, not the first one: in development Next serves CSS across
# several files in no stable order, so checking only the first fails a perfectly
# healthy page.
CSS=$(printf '%s' "$HTML" | grep -oE '/_next/static/[^"]+\.css' | sort -u)
check "a stylesheet exists"      "test -n \"$CSS\""
# The content goes into a VARIABLE before grep, instead of straight down a pipe.
# With `pipefail` on, `curl … | grep -q` fails the check even when the colour is
# there: `-q` closes the pipe on the first match, curl dies of SIGPIPE, and the
# PIPELINE's status is curl's.
brand=1
for sheet in $CSS; do
  content=$(curl -sf "$WEB$sheet" || true)
  case "$content" in
    *df285d* | *DF285D*) brand=0; break ;;
  esac
done
check "design system loaded (brand colour in the stylesheet)" "test $brand -eq 0"
check "the app hydrates (JS served)" "printf '%s' \"\$HTML\" | grep -q '_next/static/chunks'"
check "the brand is on the page"     "printf '%s' \"\$HTML\" | grep -qi 'barte'"

echo
if [ "$failures" -eq 0 ]; then
  echo "all good."
  echo
  echo "before presenting, take one pass with your own eyes:"
  echo "  1. open $WEB and run the whole pipeline once"
  echo "  2. open an item that stopped and read the decision trail"
  echo "  3. open 'A stack desta demo' at the bottom and watch the live calls"
  echo "  4. narrow the window to the width of the laptop you will project from"
else
  echo "$failures check(s) failed — do not present like this."
fi
exit "$failures"
