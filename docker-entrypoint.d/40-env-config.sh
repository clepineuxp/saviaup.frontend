#!/bin/sh
set -e

TARGET_FILE="/usr/share/nginx/html/env-config.js"

# Export only the public settings consumed by the browser. JSON encoding preserves
# quotes, backslashes and Unicode without interpolating values into JavaScript.
RUNTIME_CONFIG=$(jq -cn --ascii-output \
  --arg apiUrl "${API_URL:-}" \
  --arg signalRUrl "${SIGNALR_URL:-}" \
  '{apiUrl: $apiUrl, signalRUrl: $signalRUrl}')

TEMP_FILE=$(mktemp "${TARGET_FILE}.XXXXXX")
trap 'rm -f "$TEMP_FILE"' EXIT HUP INT TERM
printf 'window.__env = Object.freeze(%s);\n' "$RUNTIME_CONFIG" > "$TEMP_FILE"
chmod 644 "$TEMP_FILE"
mv -f "$TEMP_FILE" "$TARGET_FILE"

echo "[env-config] Public runtime configuration generated."
