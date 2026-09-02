// Runtime Environment Hotloading placeholder for Docker / Kubernetes injection
// In production Docker, entrypoint.sh generates this file dynamically from container environment variables.
window.__HUMID1_CONFIG__ = window.__HUMID1_CONFIG__ || {
  THINGSBOARD_SERVER_URL: "https://app.humid1.com",
  AUTHENTIK_URL: "https://auth.humid1.com",
  CAPTCHA_URL: "https://cap.humid1.com",
  CHAT_URL: "https://chat.humid1.com",
  DASHBOARD_URL: "https://dash.humid1.com",
  SSO_AUTH_ENDPOINT: "https://app.humid1.com/oauth2/authorization/authentik"
};
