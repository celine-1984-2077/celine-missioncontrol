#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:4173/}"
OUT_DIR="${2:-/tmp/mission-control-browser-review}"
APP="${BROWSER_APP:-Safari}"
WAIT_SECONDS="${BROWSER_REVIEW_WAIT_SECONDS:-2}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
RAW="$OUT_DIR/review-$STAMP.png"
JSON="$OUT_DIR/review-$STAMP.json"
LATEST="$OUT_DIR/latest.json"

peekaboo app launch "$APP" --open "$URL"
sleep "$WAIT_SECONDS"
SEE_OUTPUT="$(peekaboo see --app "$APP" --annotate --path "$RAW" --json)"
printf '%s\n' "$SEE_OUTPUT" > "$JSON"
cp "$JSON" "$LATEST"

SNAPSHOT_ID="$(python3 - <<'PY' "$JSON"
import json, sys
with open(sys.argv[1]) as fh:
    data = json.load(fh)
print(data.get('data', {}).get('snapshot_id', ''))
PY
)"

cat <<EOF

Browser review capture complete.
URL: $URL
App: $APP
Screenshot: $RAW
Artifact JSON: $JSON
Latest JSON: $LATEST
Snapshot ID: $SNAPSHOT_ID
EOF
