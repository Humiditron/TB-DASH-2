# HUMID1_OS Architecture & System Specification

## 1. System Overview

HUMID1_OS is a self-hosted humidor monitoring and telemetry stack built on ESP32 hardware, ThingsBoard CE, and Caddy. It monitors relative humidity, temperature, battery, and signal strength, syncs audio prompts over HTTP, and provides real-time control via a customer-scoped React PWA / Android TWA dashboard.

## 2. Unified Data & Attribute Schema

| **Category** | **Key** | **Type** | **Flow / Scope** | **Description** |
| :--- | :--- | :--- | :--- | :--- |
| **Telemetry** | `rh` | Numeric (%) | Device $\rightarrow$ TB | Relative humidity reading (evaluated against 65%–75% safe bounds). |
| **Telemetry** | `temp` | Numeric (°F) | Device $\rightarrow$ TB | Temperature reading (evaluated against 75°F alert ceiling). |
| **Telemetry** | `battery` | Numeric (%) | Device $\rightarrow$ TB | Remaining battery percentage; triggers low-power alert at <20%. |
| **Telemetry** | `rssi` | Numeric (dBm) | Device $\rightarrow$ TB | Wi-Fi Received Signal Strength Indicator. |
| **Client Attribute** | `fw_version` | String | Device $\rightarrow$ TB | Active firmware version build identifier (e.g. `v1.0.4`). |
| **Client Attribute** | `device_name` | String | Device $\rightarrow$ TB | Hostname / display identifier for the device. |
| **Client Attribute** | `mac_address` | String | Device $\rightarrow$ TB | Hardware MAC address for networking diagnostics. |
| **Client Attribute** | `ssid` | String | Device $\rightarrow$ TB | Connected Wi-Fi Access Point name. |
| **Client Attribute** | `ip_address` | String | Device $\rightarrow$ TB | Assigned local IPv4 address. |
| **Client Attribute** | `has_sd_card` | Boolean | Device $\rightarrow$ TB | Hardware detection flag for microSD card slot presence. |
| **Client Attribute** | `audio_synced` | Boolean | Device $\rightarrow$ TB | Set to `true` once device downloads and verifies all audio assets. |
| **Shared Attribute** | `sleep_interval_sec` | Numeric (s) | TB $\rightarrow$ Device | Deep-sleep duration between active telemetry cycles (Default: 900s). |
| **Shared Attribute** | `device_theme` | String/Enum | TB $\rightarrow$ Device | Local visual mode (`DARK`, `LIGHT`, `STEALTH`). |
| **Shared Attribute** | `sound_enabled` | Boolean | TB $\rightarrow$ Device | Audio toggle; locked `false` if `has_sd_card` OR `audio_synced` is `false`. |
| **Shared Attribute** | `auto_update_enabled` | Boolean | TB $\rightarrow$ Device | Opt-in toggle for automatic background OTA firmware updates. |
| **Shared Attribute** | `manual_ota_trigger` | Boolean | TB $\rightarrow$ Device | Web app sets `true` to force immediate OTA firmware update on next wake. |

## 3. Microcontroller Power & Hardware Architecture

### Fast Wi-Fi Re-Association Strategy
To maximize battery life during deep-sleep wake cycles, the ESP32 caches BSSID, channel, and IP parameters in RTC fast memory:
1. **Boot:** Read BSSID, Wi-Fi channel, and static network settings from RTC fast memory.
2. **Fast Connect:** Execute `WiFi.begin(ssid, pass, channel, bssid)` to skip full spectrum scanning (<800 ms connection time).
3. **Time Sync:** Extract server epoch timestamp from HTTP response headers or RPC (`getCurrentTime`) and set internal RTC via `settimeofday()`.
4. **Payload Push:** Transmit telemetry (`rh`, `temp`, `battery`, `rssi`) and client attributes to ThingsBoard via MQTT/HTTP.
5. **Sleep State:** Power down radio and peripherals; return to RTC deep sleep.

### Button Interrupt (EXT0)
- RTC GPIO wake interrupt (`EXT0`) allows a physical button press to immediately wake the ESP32 outside scheduled sleep intervals for an on-demand measurement and sync.

## 4. Audio Synchronization Pipeline
- **Server Hosting:** Audio assets and manifest located at `https://humid1.com/audio/`.
- **Hardware Detection & Sync:**
  - **No SD Card:** Device reports `has_sd_card = false`, disables audio drivers, and reports `audio_synced = false`.
  - **SD Card Present:** Device fetches `https://humid1.com/audio/manifest.json`, checks hashes against local `/sd/audio/`, downloads missing `.mp3` files, and sets client attribute `audio_synced = true`.

## 5. Automation & Rule Engine Pipeline
- **Environmental Alarms:** Filter nodes evaluate incoming telemetry (`rh < 65%` or `rh > 75%`, `temp > 75°F`) to raise/clear alarms and trigger browser Web Push notifications.
- **Low Battery Alert:** Filter node routes payloads where `battery < 20%` to generate warning alarms.
- **OTA Lifecycle Handling:** Rule Chain captures `fw_version` attribute updates upon reboot to verify update success, and processes `manual_ota_trigger` commands.

## 6. Dashboard & User Interface Architecture
- **News-Channel Ticker:** Horizontal scrolling header displaying live status chips for all customer devices.
- **Device Claiming:** Modal to bind unassigned hardware via `deviceName` and secret PIN.
- **Header Diagnostics:** Displays `device_name`, `mac_address`, `ip_address`, `ssid`, `fw_version`, `rssi` meter, and microSD status badge.
- **Historical Data Visualizer:** Synchronized dual-axis line chart plotting `rh` and `temp` with a 3-day rolling default and highlighted 65%–75% comfort band.
- **Real-Time Cards:** Live gauges for `rh`, `temp` (°F/°C toggle), and `battery`.
- **Control Panel:** Interactive controls for `sleep_interval_sec`, `device_theme`, `auto_update_enabled`, and `sound_enabled` (locked out unless `has_sd_card` & `audio_synced` are both `true`).
- **Manual OTA Center:** One-click OTA deployment trigger and live progress tracking (`fw_progress`).

## 7. Implementation Roadmap
1. **Phase 1 (Server Assets & TB Setup):** Deploy `manifest.json` and `.mp3` files to audio server. Configure Caddy CORS, Digital Asset Links (`assetlinks.json`), and ThingsBoard Rule Chains.
2. **Phase 2 (Frontend Dashboard / PWA):** Build React app with Authentik SSO, device claiming, news ticker, dual-axis Recharts, and Web Push notifications. Wrap as Android TWA via Bubblewrap.
3. **Phase 3 (ESP32 Firmware):** Implement RTC fast Wi-Fi re-association, epoch time sync on boot, EXT0 button interrupt, SD manifest sync, and OTA state machine.
4. **Phase 4 (CI/CD Pipelines):** Configure GitHub Actions workflows for automated firmware binary compilation/ThingsBoard OTA push and PWA/Android TWA releases.
