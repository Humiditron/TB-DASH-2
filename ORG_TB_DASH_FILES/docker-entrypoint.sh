#!/bin/sh
set -e

ENV_FILE="/usr/share/nginx/html/env-config.js"

echo "Generating runtime environment configuration at ${ENV_FILE}..."

cat <<EOF > "$ENV_FILE"
window.__ENV__ = {
  VITE_APP_TITLE: "${VITE_APP_TITLE:-}",
  VITE_APP_DESCRIPTION: "${VITE_APP_DESCRIPTION:-}",
  VITE_APP_REDIRECT_URI: "${VITE_APP_REDIRECT_URI:-}",
  VITE_THINGSBOARD_URL: "${VITE_THINGSBOARD_URL:-}",
  VITE_AUTHENTIK_URL: "${VITE_AUTHENTIK_URL:-}",
  VITE_AUTHENTIK_CLIENT_ID: "${VITE_AUTHENTIK_CLIENT_ID:-}",
  VITE_AUTHENTIK_APP_SLUG: "${VITE_AUTHENTIK_APP_SLUG:-}"
};
EOF

chmod 644 "$ENV_FILE"

echo "Runtime environment variables successfully injected:"
echo " - VITE_APP_TITLE: ${VITE_APP_TITLE:-HUMID1_OS}"
echo " - VITE_THINGSBOARD_URL: ${VITE_THINGSBOARD_URL:-(not set)}"
echo " - VITE_AUTHENTIK_URL: ${VITE_AUTHENTIK_URL:-(not set)}"
echo " - VITE_AUTHENTIK_CLIENT_ID: ${VITE_AUTHENTIK_CLIENT_ID:-(not set)}"

exec "$@"
