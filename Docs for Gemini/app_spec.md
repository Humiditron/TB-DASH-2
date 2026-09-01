# Preface - Requirements

Please build a complete, interactive, single-page React + TypeScript + Tailwind CSS application based on the following specification.

IMPORTANT INSTRUCTIONS FOR THE MOCKUP:
1. Provide rich, realistic default seed state (2-3 humidor devices: e.g., "Main Cabinet [Online]", "Aging Box [Online]", "Travel Case [Offline]") so all visual elements, the scrolling news ticker, gauges, Recharts historical graphs, and control sliders render beautifully right out of the box.
2. Ensure all interactive UI elements work in the preview:
   - Clicking a device in the news ticker or dropdown switches the active view.
   - The "sound_enabled" toggle enforces the lockout rule (disabled with tooltip if SD card is missing or audio is not synced).
   - Claiming modal opens and allows adding a new device to the ticker.
   - Live °F / °C toggle updates the temperature gauge and charts dynamically.
   - The manual OTA push button triggers the progress bar animation.
3. Structure the ThingsBoard REST / WebSocket service cleanly in a dedicated module so it can be pointed to a live server by simply updating an environment variable or config modal.

# HUMID1_OS - Frontend Web Dashboard & PWA/TWA Specification

## 1. System Role & Scope
A responsive React application engineered as an installable **Progressive Web App (PWA)** ready for **Trusted Web Activity (TWA)** compilation to native Android APKs. It connects directly to ThingsBoard CE with seamless JWT refresh rotation, multi-device ticker monitoring, humidor threshold tracking, browser push notifications, and device claiming. **No offline simulation is included**; if a device is unreachable, it is flagged as offline.

---

## 2. Tech Stack & Architecture
- **Framework:** React 18+, TypeScript, Vite
- **Styling & UI:** Tailwind CSS, Lucide React icons
- **Charts:** Recharts (dual-axis synchronized time-series)
- **Networking:** Axios with automated JWT Refresh Interceptors + Native WebSockets
- **PWA & TWA Stack:** Vite PWA Plugin, Workbox Service Worker, Web Push API, Digital Asset Links

---

## 3. PWA to Android TWA Architecture

### A. Web App Manifest (`manifest.webmanifest`)
Configured for full standalone Android TWA experience without browser chrome/URL bars:
```json
{
  "name": "HUMID1 Humidor OS",
  "short_name": "HUMID1",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### B. Android TWA Verification (`assetlinks.json`)
The dashboard domain serves `/.well-known/assetlinks.json` linking the web app origin directly to the Android app's package name (`com.humid1.app`) and SHA-256 certificate fingerprint for transparent, bar-free TWA rendering.

---

## 4. Authentication, CORS & Silent Token Refresh

### Axios Refresh Interceptor
To ensure sessions never expire unexpectedly:
1. Every outbound request sends the current JWT Bearer token via `X-Authorization`.
2. On token expiration (HTTP `401 Unauthorized`), the Axios response interceptor intercepts the failure, calls `POST /api/auth/token/refresh` with the stored `refreshToken`, updates the active token, and retries the original request seamlessly.
3. CORS `withCredentials: true` is enforced on all API client calls.

---

## 5. UI Modules & Functional Specifications

### A. Multi-Device Header & Navigation
1. **Live Device Ticker (News-Channel Style):**
   - Continuously scrolling top-bar ticker displaying live summary chips for **all active devices**.
   - Each chip displays: `device_name`, `rh%`, `temp°`, `battery%`, `rssi` icon, and `ONLINE` (green) / `SLEEP` (gray) status pill.
   - Clicking any chip immediately switches the dashboard view to that specific device.
2. **Device Selector Dropdown:**
   - Header dropdown to quickly filter and select a target device.
   - "+ Claim Device" action button permanently accessible in header.

### B. Device Claiming Modal
- Interactive modal triggered by the "+ Claim Device" button.
- Form inputs:
  - `Device Name` (e.g. `HUMID1-Cabinet-01`)
  - `Secret Key / Claim PIN`
- Submits to `POST /api/customer/device/claim`. Upon success, refreshes the device list and immediately selects the newly claimed unit.

### C. Device Diagnostics & Status Header (Selected Device)
- Displays client attributes: `device_name`, `fw_version`, `mac_address`, `ip_address`, `ssid`.
- **RSSI Signal Meter:** Multi-bar icon color-coded to `rssi` dBm (Excellent: > -50 dBm, Good: -50 to -70 dBm, Weak: < -70 dBm).
- **SD Card Status Badge:** 
  - `SD Card: Inserted` (Green) when `has_sd_card === true`
  - `SD Card: Not Detected` (Amber) when `has_sd_card === false`
- **Real Online/Offline Status:** Evaluated directly against the last telemetry timestamp. If no packet arrives within the expected `sleep_interval_sec` window + grace period, state displays as `OFFLINE / UNREACHABLE`.

### D. Live Climate Gauges & Visualizer
- **Relative Humidity (`rh`):** Numerical gauge with comfort band highlight (Green: `65%–75%`, Blue: `<65% Dry`, Red: `>75% Molding Risk`).
- **Temperature (`temp`):** Live temperature card with quick `°F / °C` toggle. Alert banner if `> 75°F` (`23.9°C`).
- **Battery (`battery`):** Visual battery meter; red pulse warning if `< 20%`.
- **Historical Chart (Recharts):**
  - Synchronized dual-axis plot (`rh` right axis, `temp` left axis).
  - Default rolling window: **3 Days** (with range selector: `12h`, `24h`, `3d`, `7d`).
  - Shaded reference area marking the **65%–75% RH** ideal humidor zone.

### E. Control Panel & Audio Lockout Logic
Directly modifies ThingsBoard **Shared Attributes**:

| Widget | Target Attribute | Control Type | Logic / Lockout Rule |
| :--- | :--- | :--- | :--- |
| **Deep Sleep Interval** | `sleep_interval_sec` | Slider (60s – 3600s) | Updates RTC wake interval |
| **Visual Theme** | `device_theme` | Dropdown (`DARK`, `LIGHT`, `STEALTH`) | Changes device screen appearance |
| **Audio Alerts** | `sound_enabled` | Toggle Switch | **HARD LOCKOUT:** Disabled if `has_sd_card === false` OR `audio_synced === false`. Shows tooltip: *"Audio locked: SD card required & audio download must be complete."* |
| **Auto Update** | `auto_update_enabled`| Toggle Switch | Opt-in for background firmware deployment |

### F. Manual OTA Firmware Update Center
- Displays active device build (`fw_version`) vs. latest server release.
- **"Push OTA Update Now" Button:**
  - Pushes `manual_ota_trigger = true` and target package ID to ThingsBoard via REST.
  - Microcontroller executes the firmware download upon its next wake cycle.
- **Live OTA Progress Bar:** Listens for `fw_state` (`DOWNLOADING`, `VERIFIED`, `UPDATING`) and animates `fw_progress` (0–100%).

### G. Alarms Feed & Web Push Notifications
- **Alarms Feed:** Displays active alarms categorized by severity (`CRITICAL`, `MAJOR`, `WARNING`).
- **One-Click Actions:** Direct API triggers for `/api/alarm/{id}/ack` and `/api/alarm/{id}/clear`.
- **Browser & Mobile Web Push Notifications:**
  - "Enable Push Notifications" toggle in dashboard header.
  - Subscribes via Service Worker & Web Push API to receive background push alerts for:
    * `CRITICAL`: Humidity out of bounds (`<65%` or `>75%`).
    * `MAJOR`: Temperature threshold breach (`>75°F`).
    * `WARNING`: Battery below 20%.
