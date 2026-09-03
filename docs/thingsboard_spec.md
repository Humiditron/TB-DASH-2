# HUMID1_OS - ThingsBoard Platform Architecture & Infrastructure Specification

## 1. System Role & Scope
ThingsBoard Community Edition (CE) acts as the centralized IoT backend behind a Caddy reverse proxy. It handles ESP32 device telemetry ingestion, client/shared attribute state sync, time synchronization on boot, rule-engine humidor safety alarms, OTA binary delivery, and secure REST/WebSocket access for the PWA/TWA client.

---

## 2. Infrastructure, Security & CORS Configuration

### A. Caddy Reverse Proxy & CORS Policy
To enable credentialed REST/WebSocket access from PWA/TWA origins without authentication dropouts, Caddy is configured with strict CORS and security headers:

```caddy
humid1.yourdomain.com {
    # CORS Headers for Authenticated API Access
    @cors_preflight method OPTIONS
    handle @cors_preflight {
        header Access-Control-Allow-Origin "https://app.humid1.yourdomain.com"
        header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        header Access-Control-Allow-Headers "Authorization, X-Authorization, Content-Type, Accept"
        header Access-Control-Allow-Credentials "true"
        header Access-Control-Max-Age "86400"
        respond 204
    }

    header {
        Access-Control-Allow-Origin "https://app.humid1.yourdomain.com"
        Access-Control-Allow-Credentials "true"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }

    # Android TWA Digital Asset Links Verification
    handle /.well-known/assetlinks.json {
        header Content-Type "application/json"
        file_server {
            root /var/www/well-known
        }
    }

    # ThingsBoard Proxy
    reverse_proxy localhost:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```

### B. Continuous Authentication & Token Lifecycle
- **Access Tokens:** Short/medium-lived JWTs (`X-Authorization: Bearer <token>`) passed in API headers.
- **Silent Refresh Endpoint:** `POST /api/auth/token/refresh` with `refreshToken` payload to continuously renew expired JWTs automatically in the background without forcing user re-logins.

---

## 3. Microcontroller Epoch Time Synchronization on Boot
To ensure accurate data timestamping and scheduled deep sleep without requiring a standalone NTP server, the ESP32 synchronizes its internal RTC epoch clock upon waking:

1. **HTTP Telemetry Header Extraction (Fastest):** ESP32 reads the standard `Date` header in the HTTP `200 OK` response during its initial telemetry burst.
2. **Dedicated Time Sync RPC (Alternative):**
   - **Device Request:** `POST /api/v1/{ACCESS_TOKEN}/rpc` $\rightarrow$ `{"method": "getCurrentTime", "params": {}}`
   - **ThingsBoard Response:** `{"epoch_ms": 1788055200000}`
3. **ESP32 Internal Clock Set:** Microcontroller executes `settimeofday()` using the returned epoch timestamp before entering deep sleep.

---

## 4. Unified Data & Attribute Schema

### A. Time-Series Telemetry (Device $\rightarrow$ TB)
| Key | Type | Unit | Description / Bounds |
| :--- | :--- | :--- | :--- |
| `rh` | Numeric (Float) | % | Relative humidity (`65% <= rh <= 75%` safe zone) |
| `temp` | Numeric (Float) | °F | Ambient temperature (Alert ceiling at `> 75.0°F`) |
| `battery` | Numeric (Integer) | % | Battery percentage (Alert ceiling at `< 20%`) |
| `rssi` | Numeric (Integer) | dBm | Wi-Fi Signal Strength (e.g. `-30` to `-90 dBm`) |

### B. Client Attributes (Device $\rightarrow$ TB)
| Key | Type | Description |
| :--- | :--- | :--- |
| `fw_version` | String | Active firmware version build string (e.g. `v1.0.4`) |
| `device_name` | String | Hardware hostname / display identifier |
| `mac_address` | String | Hardware MAC address |
| `ssid` | String | Connected Wi-Fi AP SSID |
| `ip_address` | String | Local IPv4 address |
| `has_sd_card` | Boolean | Hardware SD card slot detection flag (`true`/`false`) |
| `audio_synced` | Boolean | `true` once device downloads and verifies all audio files |

### C. Shared Attributes (TB $\rightarrow$ Device / App $\rightarrow$ TB)
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sleep_interval_sec` | Numeric | `900` | Deep-sleep wake interval in seconds |
| `device_theme` | String (Enum) | `DARK` | Display visual mode (`DARK`, `LIGHT`, `STEALTH`) |
| `sound_enabled` | Boolean | `false` | Audio toggle (Gated by `audio_synced` & `has_sd_card`) |
| `auto_update_enabled` | Boolean | `true` | Opt-in toggle for automatic background OTA |
| `manual_ota_trigger` | Boolean | `false` | Set to `true` by Web App to force an immediate OTA flash |

---

## 5. Rule Chain & Alarms Pipeline

```
[Incoming Telemetry / State]
       │
       ├──> [Save Telemetry] (rh, temp, battery, rssi)
       │
       ├──> [RH Filter] ─────────> rh < 65% (Dry) or rh > 75% (Mold Risk) ──> [Raise Alarm] ──> [Web Push API]
       │                          65% <= rh <= 75%                         ──> [Clear Alarm]
       │
       ├──> [Temp Filter] ───────> temp > 75°F (Beetle Hazard)             ──> [Raise Alarm] ──> [Web Push API]
       │                          temp <= 75°F                             ──> [Clear Alarm]
       │
       ├──> [Low Battery Filter] ─> battery < 20%                          ──> [Raise Alarm] ──> [Web Push API]
       │                          battery >= 20%                           ──> [Clear Alarm]
       │
       └──> [OTA Status Handler] ─> Monitors fw_state / triggers manual_ota_trigger
```

---

## 6. ThingsBoard API Contracts
1. **Device Claiming:** `POST /api/customer/device/claim` (Binds device via `deviceName` & secret PIN).
2. **Device Discovery:** `GET /api/customer/devices` (Fetches list of owned devices).
3. **Telemetry & Attributes:**
   - `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries` (Historical query).
   - `POST /api/plugins/telemetry/DEVICE/{deviceId}/SHARED_SCOPE` (Set shared attributes).
   - `/api/ws/plugins/telemetry` (Live WebSocket stream).
4. **Alarm Management:** `GET /api/alarm/DEVICE/{deviceId}`, `POST /api/alarm/{id}/ack`, `POST /api/alarm/{id}/clear`.
5. **OTA Management:** `POST /api/otaPackage` and target firmware profile assignment.
