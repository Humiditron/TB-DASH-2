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

cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_APP_TITLE: "${VITE_APP_TITLE:-HUMID1_OS}",
  VITE_APP_DESCRIPTION: "${VITE_APP_DESCRIPTION:-Precision Humidor Monitoring & Telemetry Stack}",
  VITE_THINGSBOARD_URL: "${THINGSBOARD_SERVER_URL:-${VITE_THINGSBOARD_URL:-https://app.humid1.com}}",
  VITE_AUTHENTIK_URL: "${AUTHENTIK_URL:-${VITE_AUTHENTIK_URL:-https://auth.humid1.com}}",
  VITE_AUTHENTIK_APP_SLUG: "${AUTHENTIK_SLUG:-${VITE_AUTHENTIK_APP_SLUG:-humid1-dash}}",
  VITE_AUTHENTIK_CLIENT_ID: "${AUTHENTIK_CLIENT_ID:-${VITE_AUTHENTIK_CLIENT_ID:-7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI}}",
  VITE_APP_REDIRECT_URI: "${VITE_APP_REDIRECT_URI:-}"
};
EOF

# Execute standard CMD (starts Nginx)
exec "$@"
