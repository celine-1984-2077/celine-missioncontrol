#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:4173/}"
APP="${BROWSER_APP:-Safari}"
OUT_DIR="${2:-/tmp/mission-control-browser-review}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
RAW="$OUT_DIR/review-$STAMP.png"

peekaboo app launch "$APP" --open "$URL"
sleep 2
peekaboo see --app "$APP" --annotate --path "$RAW"

echo

echo "Browser review capture complete."
echo "URL: $URL"
echo "App: $APP"
echo "Image prefix: $RAW"
echo "Tip: use the latest Snapshot ID from output for follow-up clicks/checks."
