#!/bin/sh
set -e

TARGET_FILE="/usr/share/nginx/html/env-config.js"

API_URL="${API_URL:-}"
SIGNALR_URL="${SIGNALR_URL:-}"

cat <<EOF > "$TARGET_FILE"
(function (window) {
  window.__env = window.__env || {};
  window.__env.apiUrl = '${API_URL}';
  window.__env.signalRUrl = '${SIGNALR_URL}';
})(this);
EOF

echo "[env-config] Injected Kubernetes variables into $TARGET_FILE (API_URL=${API_URL}, SIGNALR_URL=${SIGNALR_URL})"
