#!/bin/sh
set -e

# Dynamically generate runtime configuration for the SPA
cat <<EOF > /usr/share/nginx/html/config.js
window.__HUMID1_CONFIG__ = {
  THINGSBOARD_SERVER_URL: "${THINGSBOARD_SERVER_URL:-${VITE_THINGSBOARD_SERVER_URL:-https://app.humid1.com}}",
  AUTHENTIK_URL: "${AUTHENTIK_URL:-${VITE_AUTHENTIK_URL:-https://auth.humid1.com}}",
  CAPTCHA_URL: "${CAPTCHA_URL:-${VITE_CAPTCHA_URL:-https://cap.humid1.com}}",
  CHAT_URL: "${CHAT_URL:-${VITE_CHAT_URL:-https://chat.humid1.com}}",
  DASHBOARD_URL: "${DASHBOARD_URL:-${VITE_DASHBOARD_URL:-https://dash.humid1.com}}",
  SSO_AUTH_ENDPOINT: "${SSO_AUTH_ENDPOINT:-${VITE_SSO_AUTH_ENDPOINT:-https://app.humid1.com/oauth2/authorization/authentik}}"
};
console.info("[HUMID1_OS] Runtime domain config loaded successfully.", window.__HUMID1_CONFIG__);
EOF

# Execute standard CMD (starts Nginx)
exec "$@"
