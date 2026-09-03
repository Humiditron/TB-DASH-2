# HUMID1_OS Dashboard

> **Production-Grade IoT Telemetry & Climate Control Platform for Precision Cigar Humidors**

HUMID1_OS is a modern, high-performance web dashboard built with React 18, TypeScript, Tailwind CSS, and Vite. It connects directly to the ThingsBoard IoT engine and Authentik Identity Provider to provide real-time climate monitoring, dual-axis telemetry visualization, hardware claiming, shared-attribute remote controls, over-the-air (OTA) firmware update orchestration, and real-time alarms.

---

## 🏛️ Architecture Overview

```
├── public/                 # Static assets, Web Manifest, Favicons, Runtime Config Placeholders
├── docs/                   # Architecture, App Specs, and Workflow Documentation
│   ├── app_spec.md
│   ├── master_plan.md
│   ├── release_workflow.md
│   └── thingsboard_spec.md
├── src/
│   ├── components/         # Modular, isolated UI and modal components
│   │   ├── AlarmsFeed.tsx              # Active & historic alarms feed with Ack/Clear actions
│   │   ├── ApiInspectorModal.tsx       # Live HTTP transaction inspector, raw logs & token decoder
│   │   ├── AuthModal.tsx               # ThingsBoard REST & SSO authentication manager
│   │   ├── ClaimDeviceModal.tsx        # Hardware device claiming workflow modal
│   │   ├── ClimateGauges.tsx           # Real-time RH%, Temperature, Battery, and RSSI gauges
│   │   ├── ControlPanel.tsx            # Remote hardware parameters (sleep interval, audio, theme)
│   │   ├── DeviceStatusHeader.tsx      # Active hardware unit selector & health diagnostics
│   │   ├── HeaderTicker.tsx            # Stock-ticker style live multi-device status marquee
│   │   ├── HistoricalChart.tsx         # Synchronized Recharts dual-axis climate history
│   │   ├── HumidorTelemetryWidget.tsx  # Direct @enerlab/thingsboard-client timeseries monitor
│   │   ├── OtaUpdateCenter.tsx         # OTA firmware release manager and live progress bar
│   │   ├── ProtectedRoute.tsx          # Auth-guard gate supporting Authentik OIDC & ThingsBoard JWT
│   │   ├── RemoveDeviceModal.tsx       # Device unclaim / delete confirmation dialog
│   │   └── ServerConfigModal.tsx       # Runtime endpoints & domain configuration modal
│   ├── config/
│   │   └── env.ts                      # Domain aggregator & runtime environment loader
│   ├── hooks/
│   │   └── useThingsBoardTelemetry.ts  # Typed telemetry hook with delta-detection & sleep tracking
│   ├── services/
│   │   ├── apiClientInit.ts            # Global interceptors with reactive token refresh
│   │   ├── apiLogger.ts                # In-memory & localStorage HTTP network transaction recorder
│   │   ├── oidcConfig.ts               # Authentik OpenID Connect client configuration
│   │   ├── tbClientService.ts          # @enerlab/thingsboard-client singleton & Zod schema parser
│   │   └── thingsboard.ts              # Unified ThingsBoard IoT engine (telemetry, RPC, claiming)
│   ├── utils/
│   │   ├── authTokens.ts               # JWT normalization, expiration check & token discovery
│   │   ├── env.ts                      # Universal environment variable accessor
│   │   └── url.ts                      # Domain and URL normalization helpers
│   ├── types.ts            # Centralized TypeScript interface & enum definitions
│   ├── App.tsx             # Root application orchestrator
│   └── main.tsx            # Application entry point with OIDC AuthProvider wrapping
├── Dockerfile              # Multi-stage optimized production build (Node builder + Alpine Nginx)
├── docker-compose.yml      # Container orchestration with environment variable passing
├── docker-entrypoint.sh    # Dynamic runtime environment injector (generates config.js at boot)
└── nginx.conf              # Production Nginx reverse-proxy configuration with SPA fallback
```

---

## ⚡ Key Features

- **Multi-Device Live Marquee Ticker:** Continuously scrolling top-bar ticker displaying real-time humidity, temperature, battery, and connection status across all claimed units.
- **Precision Climate Gauges:** Instantaneous visual feedback with comfort range indicators (65%–75% RH target band) and dynamic °F/°C unit switching.
- **Synchronized Historical Analytics:** High-resolution dual-axis time-series charts (12h, 24h, 3d, 7d ranges) powered by Recharts.
- **ThingsBoard SDK & REST Integration:** Powered by `@enerlab/thingsboard-client` with proactive and reactive 401 token refresh interceptors.
- **Authentik SSO & OIDC Security:** Unified authentication gate supporting OAuth2 SSO redirects and direct REST token inspection.
- **Remote Hardware Control:** Adjust RTC deep-sleep wake intervals, visual device themes, and sound alert toggles with hardware safety lockout rules.
- **Live OTA Firmware Updates:** Track firmware release states (`DOWNLOADING`, `VERIFIED`, `UPDATING`) with real-time percentage progress indicators.
- **Real-Time Alarms Management:** Acknowledge and clear active humidor threshold violations and system warnings with one click.
- **Built-in API Transaction Inspector:** Real-time diagnostics modal recording every outbound request, response status, duration, and payload.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🐳 Docker Deployment

The application is bundled into a lightweight, secure container image running Nginx Alpine with runtime environment variable injection:

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

Container runtime variables are dynamically compiled into `window.__HUMID1_CONFIG__` and `window.__ENV__` by `docker-entrypoint.sh` upon container start.

---

## 🔧 Environment Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_DASHBOARD_URL` | `https://dash.humid1.com` | Origin URL for this dashboard instance |
| `VITE_THINGSBOARD_SERVER_URL` | `https://app.humid1.com` | ThingsBoard IoT platform endpoint |
| `VITE_AUTHENTIK_URL` | `https://auth.humid1.com` | Authentik Identity Provider endpoint |
| `VITE_AUTHENTIK_APP_SLUG` | `humid1-dash` | Authentik Application provider slug |
| `VITE_AUTHENTIK_CLIENT_ID` | `7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI` | Authentik OAuth2 Client ID |
| `VITE_SSO_AUTH_ENDPOINT` | `https://app.humid1.com/oauth2/authorization/authentik` | ThingsBoard OAuth2 initiation route |
| `VITE_CAPTCHA_URL` | `https://cap.humid1.com` | Security service endpoint |
| `VITE_CHAT_URL` | `https://chat.humid1.com` | Customer messaging service endpoint |
| `VITE_DEFAULT_DEVICE_NAME` | `HUMID1-CABINET-01` | Default hardware testing identifier |

---

## 🧪 Quality & Verification

Run the TypeScript type checker and linter:
```bash
npm run lint
```

Build the production distribution:
```bash
npm run build
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
