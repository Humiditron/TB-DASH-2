# HUMID1_OS — Comprehensive API Transaction Manifest & JSON Reference

This manifest provides a complete, structured catalog of the exact HTTP request/response JSON payloads, headers, query parameters, and WebSocket event structures used across the HUMID1_OS telemetry stack (ThingsBoard CE IoT Core, Authentik Identity Provider, and the Frontend Dashboard).

---

## Table of Contents

1. [Authentication & Session Lifecycle](#1-authentication--session-lifecycle)
   - [1.1 ThingsBoard REST Login (`POST /api/auth/login`)](#11-thingsboard-rest-login)
   - [1.2 Silent Token Refresh (`POST /api/auth/token/refresh`)](#12-silent-token-refresh)
   - [1.3 Authentik OIDC Authorization & Token Exchange](#13-authentik-oidc-authorization--token-exchange)
   - [1.4 ThingsBoard OAuth2 SSO Redirect (`GET /oauth2/authorization/{providerId}`)](#14-thingsboard-oauth2-sso-redirect)
   - [1.5 Current User Profile (`GET /api/auth/user`)](#15-current-user-profile)
2. [Telemetry & Time-Series Data](#2-telemetry--time-series-data)
   - [2.1 Fetch Latest Real-Time Telemetry (`GET /api/plugins/telemetry/...`)](#21-fetch-latest-real-time-telemetry)
   - [2.2 Query Historical Time-Series (`GET /api/plugins/telemetry/.../values/timeseries`)](#22-query-historical-time-series)
   - [2.3 Hardware Telemetry Ingest (`POST /api/v1/{ACCESS_TOKEN}/telemetry`)](#23-hardware-telemetry-ingest)
3. [Device Attributes (Client & Shared)](#3-device-attributes-client--shared)
   - [3.1 Fetch Device Attributes (`GET /api/plugins/telemetry/.../values/attributes`)](#31-fetch-device-attributes)
   - [3.2 Update Shared Attributes (`POST /api/plugins/telemetry/.../SHARED_SCOPE`)](#32-update-shared-attributes)
   - [3.3 Hardware Client Attributes Ingest (`POST /api/v1/{ACCESS_TOKEN}/attributes`)](#33-hardware-client-attributes-ingest)
4. [Device Discovery, Claiming & Management](#4-device-discovery-claiming--management)
   - [4.1 Fetch Claimed / Customer Devices (`GET /api/customer/.../devices` or `GET /api/tenant/devices`)](#41-fetch-claimed--customer-devices)
   - [4.2 Claim Hardware Device (`POST /api/customer/device/claim`)](#42-claim-hardware-device)
   - [4.3 Delete / Unclaim Device (`DELETE /api/customer/device/{deviceId}`)](#43-delete--unclaim-device)
5. [RPC (Remote Procedure Calls)](#5-rpc-remote-procedure-calls)
   - [5.1 Two-Way RPC Command to Device (`POST /api/rpc/twoway/{deviceId}`)](#51-two-way-rpc-command-to-device)
   - [5.2 ESP32 Boot Epoch Time Sync RPC (`POST /api/v1/{ACCESS_TOKEN}/rpc`)](#52-esp32-boot-epoch-time-sync-rpc)
6. [Alarms Management Lifecycle](#6-alarms-management-lifecycle)
   - [6.1 Query Active & Historic Alarms (`GET /api/alarm/DEVICE/{deviceId}`)](#61-query-active--historic-alarms)
   - [6.2 Acknowledge Alarm (`POST /api/alarm/{alarmId}/ack`)](#62-acknowledge-alarm)
   - [6.3 Clear Alarm (`POST /api/alarm/{alarmId}/clear`)](#63-clear-alarm)
7. [OTA (Over-The-Air) Firmware Updates](#7-ota-over-the-air-firmware-updates)
   - [7.1 List Available OTA Firmware Packages (`GET /api/otaPackages/DEVICE`)](#71-list-available-ota-firmware-packages)
   - [7.2 Assign Firmware to Device (`POST /api/device`)](#72-assign-firmware-to-device)
   - [7.3 Device Firmware Status Telemetry (`fw_state`, `fw_version`)](#73-device-firmware-status-telemetry)

---

## 1. Authentication & Session Lifecycle

### 1.1 ThingsBoard REST Login
Authenticates a user via email/username and password directly against the ThingsBoard REST API.

- **Endpoint:** `POST https://app.humid1.com/api/auth/login`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body:**
  ```json
  {
    "username": "user@humid1.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsic3VzZXIiXSwidXNlcklkIjoiMWVmZDM5NjAtYTEwYi0xMWYxLWI1MzAtOWI5NjMxZTBjMzY1IiwidGVuYW50SWQiOiIxZWZkMzk2MC1hMTBiLTExZjEtYjUzMC05Yjk2MzFlMGMzNjUiLCJpc3MiOiJUaGluZ3NCb2FyZCIsImlhdCI6MTc4ODA1NTIwMCwiZXhwIjoxNzg4MDU4ODAwfQ.xyz...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJdLCJ1c2VySWQiOiIxZWZkMzk2MC1hMTBiLTExZjEtYjUzMC05Yjk2MzFlMGMzNjUiLCJpc3MiOiJUaGluZ3NCb2FyZCIsImlhdCI6MTc4ODA1NTIwMCwiZXhwIjoxNzg4NjYwMDAwfQ.abc..."
  }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "status": 401,
    "message": "Invalid username or password",
    "errorCode": 10,
    "timestamp": 1788055205123
  }
  ```

---

### 1.2 Silent Token Refresh
Renews an expired short-lived access JWT using the long-lived refresh token.

- **Endpoint:** `POST https://app.humid1.com/api/auth/token/refresh`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJd..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsic3VzZXIiXSwiaWF0IjoxNzg4MDU4ODAwLCJleHAiOjE3ODgwNjI0MDB9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJdLCJpYXQiOjE3ODgwNTg4MDAsImV4cCI6MTc4ODY2MzYwMH0..."
  }
  ```

---

### 1.3 Authentik OIDC Authorization & Token Exchange
Initiates OpenID Connect with PKCE (Proof Key for Code Exchange) via Authentik.

#### Step A: Authorization Request (Browser Redirect)
- **URL:** `https://auth.humid1.com/application/o/authorize/`
- **Query Parameters:**
  ```
  client_id=7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI
  &response_type=code
  &redirect_uri=https://dash.humid1.com/
  &scope=openid profile email
  &code_challenge=E9Melhoa2OwvFrGMTJguCH5rtG647NCA91823_xyz
  &code_challenge_method=S256
  &state=abc123state
  ```

#### Step B: Token Exchange Request (`POST /application/o/token/`)
- **Endpoint:** `POST https://auth.humid1.com/application/o/token/`
- **Headers:**
  ```http
  Content-Type: application/x-www-form-urlencoded
  ```
- **Body:**
  ```
  grant_type=authorization_code
  &client_id=7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI
  &code=SPL7394KDLSMN923
  &redirect_uri=https://dash.humid1.com/
  &code_verifier=dBjftJeZ4CVP-mB92Kks83jla_random_verifier_string
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguaHVtaWQxLmNvbS9hcHBsaWNhdGlvbi9vL2h1bWlkMS1kYXNoLyIsInN1YiI6IjEyMzQ1NiIsImVtYWlsIjoidXNlckBodW1pZDEuY29tIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidXNlciJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "openid profile email"
  }
  ```

---

### 1.4 ThingsBoard OAuth2 SSO Redirect
Redirects the user to ThingsBoard's internal OAuth2 client handler which provisions the user in ThingsBoard via Authentik:

- **Browser Navigation:** `GET https://app.humid1.com/oauth2/authorization/1efd3960-a10b-11f1-b530-9b9631e0c365`
- **Result:** ThingsBoard redirects to Authentik login, then returns to ThingsBoard with a session cookie and ThingsBoard JWT tokens in local storage (`jwt_token`).

---

### 1.5 Current User Profile
Retrieves the logged-in user identity, tenant, and customer assignment.

- **Endpoint:** `GET https://app.humid1.com/api/auth/user`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "id": {
      "id": "78a9c000-a10b-11f1-8a90-00163e123456",
      "entityType": "USER"
    },
    "createdTime": 1788000000000,
    "tenantId": {
      "id": "1efd3960-a10b-11f1-b530-9b9631e0c365",
      "entityType": "TENANT"
    },
    "customerId": {
      "id": "3bc24190-a10b-11f1-9abc-123456789abc",
      "entityType": "CUSTOMER"
    },
    "email": "user@humid1.com",
    "authority": "CUSTOMER_USER",
    "firstName": "Matthew",
    "lastName": "McCardle",
    "name": "user@humid1.com",
    "additionalInfo": {
      "userCredentialsEnabled": true,
      "defaultDashboardId": null
    }
  }
  ```

---

## 2. Telemetry & Time-Series Data

### 2.1 Fetch Latest Real-Time Telemetry
Retrieves the most recent telemetry values for an active device.

- **Endpoint:** `GET https://app.humid1.com/api/plugins/telemetry/DEVICE/78a9c000-a10b-11f1-8a90-00163e123456/values/timeseries?keys=rh,temp,battery,rssi,diff_rh,diff_temp,door_open,vpd`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "rh": [
      { "ts": 1788055200000, "value": "69.4" }
    ],
    "temp": [
      { "ts": 1788055200000, "value": "68.2" }
    ],
    "battery": [
      { "ts": 1788055200000, "value": "92" }
    ],
    "rssi": [
      { "ts": 1788055200000, "value": "-58" }
    ],
    "diff_rh": [
      { "ts": 1788055200000, "value": "0.8" }
    ],
    "diff_temp": [
      { "ts": 1788055200000, "value": "0.4" }
    ],
    "door_open": [
      { "ts": 1788055200000, "value": "false" }
    ],
    "vpd": [
      { "ts": 1788055200000, "value": "0.74" }
    ]
  }
  ```

---

### 2.2 Query Historical Time-Series
Queries aggregated telemetry across a timeframe (e.g. past 24 hours).

- **Endpoint:** `GET https://app.humid1.com/api/plugins/telemetry/DEVICE/78a9c000-a10b-11f1-8a90-00163e123456/values/timeseries?keys=rh,temp,battery,rssi&startTs=1787968800000&endTs=1788055200000&interval=3600000&limit=1000&agg=AVG`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "rh": [
      { "ts": 1787968800000, "value": "68.8" },
      { "ts": 1787972400000, "value": "69.0" },
      { "ts": 1787976000000, "value": "69.2" },
      { "ts": 1788055200000, "value": "69.4" }
    ],
    "temp": [
      { "ts": 1787968800000, "value": "67.9" },
      { "ts": 1787972400000, "value": "68.1" },
      { "ts": 1787976000000, "value": "68.0" },
      { "ts": 1788055200000, "value": "68.2" }
    ],
    "battery": [
      { "ts": 1787968800000, "value": "93" },
      { "ts": 1788055200000, "value": "92" }
    ],
    "rssi": [
      { "ts": 1787968800000, "value": "-57" },
      { "ts": 1788055200000, "value": "-58" }
    ]
  }
  ```

---

### 2.3 Hardware Telemetry Ingest
Sent by the ESP32 microcontroller upon waking up from deep sleep.

- **Endpoint:** `POST https://app.humid1.com/api/v1/YOUR_DEVICE_ACCESS_TOKEN/telemetry`
- **Headers:**
  ```http
  Content-Type: application/json
  ```
- **Request Body (Single or Multi-Sample with Timestamps):**
  ```json
  {
    "ts": 1788055200000,
    "values": {
      "rh": 69.4,
      "temp": 68.2,
      "battery": 92,
      "rssi": -58,
      "diff_rh": 0.8,
      "diff_temp": 0.4,
      "door_open": false,
      "vpd": 0.74,
      "sensor_top_rh": 69.8,
      "sensor_top_temp": 68.4,
      "sensor_bottom_rh": 69.0,
      "sensor_bottom_temp": 68.0
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {}
  ```

---

## 3. Device Attributes (Client & Shared)

### 3.1 Fetch Device Attributes
Retrieves static device parameters, client attributes (reported by hardware), and shared attributes (set by user/dashboard).

- **Endpoint:** `GET https://app.humid1.com/api/plugins/telemetry/DEVICE/78a9c000-a10b-11f1-8a90-00163e123456/values/attributes`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  [
    {
      "lastUpdateTs": 1788055200000,
      "key": "fw_version",
      "value": "v1.2.0"
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "device_name",
      "value": "HUMID1-CABINET-01"
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "mac_address",
      "value": "30:AE:A4:01:23:45"
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "ssid",
      "value": "Humidor-IoT-Mesh"
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "ip_address",
      "value": "192.168.1.145"
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "has_sd_card",
      "value": true
    },
    {
      "lastUpdateTs": 1788055200000,
      "key": "audio_synced",
      "value": true
    },
    {
      "lastUpdateTs": 1788054000000,
      "key": "sleep_interval_sec",
      "value": 900
    },
    {
      "lastUpdateTs": 1788054000000,
      "key": "device_theme",
      "value": "DARK"
    },
    {
      "lastUpdateTs": 1788054000000,
      "key": "sound_enabled",
      "value": true
    },
    {
      "lastUpdateTs": 1788054000000,
      "key": "auto_update_enabled",
      "value": true
    }
  ]
  ```

---

### 3.2 Update Shared Attributes
Pushed from the web dashboard to update device configuration settings.

- **Endpoint:** `POST https://app.humid1.com/api/plugins/telemetry/DEVICE/78a9c000-a10b-11f1-8a90-00163e123456/SHARED_SCOPE`
- **Headers:**
  ```http
  Content-Type: application/json
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Request Body:**
  ```json
  {
    "sleep_interval_sec": 600,
    "device_theme": "DARK",
    "sound_enabled": true,
    "auto_update_enabled": true,
    "target_rh_min": 65.0,
    "target_rh_max": 72.0,
    "temp_alert_threshold": 74.0
  }
  ```
- **Response (200 OK):**
  ```json
  {}
  ```

---

### 3.3 Hardware Client Attributes Ingest
Reported by the ESP32 on boot to announce hardware capabilities.

- **Endpoint:** `POST https://app.humid1.com/api/v1/YOUR_DEVICE_ACCESS_TOKEN/attributes`
- **Headers:**
  ```http
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "fw_version": "v1.2.0",
    "device_name": "HUMID1-CABINET-01",
    "mac_address": "30:AE:A4:01:23:45",
    "ssid": "Humidor-IoT-Mesh",
    "ip_address": "192.168.1.145",
    "has_sd_card": true,
    "audio_synced": true,
    "battery_charge_cycles": 14
  }
  ```
- **Response (200 OK):**
  ```json
  {}
  ```

---

## 4. Device Discovery, Claiming & Management

### 4.1 Fetch Claimed / Customer Devices
Fetches the list of all hardware devices linked to the logged-in customer/tenant.

- **Endpoint:** `GET https://app.humid1.com/api/customer/3bc24190-a10b-11f1-9abc-123456789abc/devices?pageSize=100&page=0&sortProperty=name&sortOrder=ASC`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": {
          "id": "78a9c000-a10b-11f1-8a90-00163e123456",
          "entityType": "DEVICE"
        },
        "createdTime": 1787000000000,
        "tenantId": {
          "id": "1efd3960-a10b-11f1-b530-9b9631e0c365",
          "entityType": "TENANT"
        },
        "customerId": {
          "id": "3bc24190-a10b-11f1-9abc-123456789abc",
          "entityType": "CUSTOMER"
        },
        "name": "HUMID1-CABINET-01",
        "type": "HUMIDOR_MONITOR",
        "label": "Master Vault",
        "deviceProfileId": {
          "id": "92da1000-a10b-11f1-a123-00163e654321",
          "entityType": "DEVICE_PROFILE"
        },
        "additionalInfo": {
          "gateway": false,
          "description": "Primary Spanish Cedar Tower"
        }
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "hasNext": false
  }
  ```

---

### 4.2 Claim Hardware Device
Links a newly purchased or provisioned ESP32 hardware device to the current user's customer account using its claiming secret key.

- **Endpoint:** `POST https://app.humid1.com/api/customer/device/claim`
- **Headers:**
  ```http
  Content-Type: application/json
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Request Body:**
  ```json
  {
    "deviceName": "HUMID1-CABINET-02",
    "secretKey": "HUMID-SEC-9874"
  }
  ```
- **Response (200 OK - Claim Success):**
  ```json
  {
    "response": "SUCCESS",
    "deviceInfo": {
      "id": {
        "id": "89b0d100-a10b-11f1-9b12-00163e789012",
        "entityType": "DEVICE"
      },
      "name": "HUMID1-CABINET-02",
      "type": "HUMIDOR_MONITOR"
    }
  }
  ```
- **Response (400 Bad Request / Claim Failed):**
  ```json
  {
    "response": "FAILURE",
    "message": "Device not found or invalid claiming secret"
  }
  ```

---

### 4.3 Delete / Unclaim Device
Removes a device from the customer's active dashboard roster.

- **Endpoint:** `DELETE https://app.humid1.com/api/customer/device/89b0d100-a10b-11f1-9b12-00163e789012`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {}
  ```

---

## 5. RPC (Remote Procedure Calls)

### 5.1 Two-Way RPC Command to Device
Sends an immediate diagnostic or calibration command to an active online unit.

- **Endpoint:** `POST https://app.humid1.com/api/rpc/twoway/78a9c000-a10b-11f1-8a90-00163e123456`
- **Headers:**
  ```http
  Content-Type: application/json
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Request Body:**
  ```json
  {
    "method": "triggerCalibration",
    "params": {
      "reference_rh": 75.0,
      "sensor_channel": "ALL"
    },
    "timeout": 5000
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "CALIBRATION_STARTED",
    "offset_applied_rh": 0.4,
    "battery_mv": 3940
  }
  ```

---

### 5.2 ESP32 Boot Epoch Time Sync RPC
Called by the ESP32 on wake to set its internal hardware RTC without an NTP server.

- **Endpoint:** `POST https://app.humid1.com/api/v1/YOUR_DEVICE_ACCESS_TOKEN/rpc`
- **Headers:**
  ```http
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "method": "getCurrentTime",
    "params": {}
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "epoch_ms": 1788055200142,
    "server_timezone": "UTC"
  }
  ```

---

## 6. Alarms Management Lifecycle

### 6.1 Query Active & Historic Alarms
Fetches triggered humidor climate and hardware threshold violations.

- **Endpoint:** `GET https://app.humid1.com/api/alarm/DEVICE/78a9c000-a10b-11f1-8a90-00163e123456?searchStatus=ANY&pageSize=20&page=0&sortProperty=createdTime&sortOrder=DESC`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": {
          "id": "e4f8a000-a10b-11f1-9abc-00163eabcdef",
          "entityType": "ALARM"
        },
        "createdTime": 1788054000000,
        "type": "HUMIDITY_LOW_ALERT",
        "originator": {
          "id": "78a9c000-a10b-11f1-8a90-00163e123456",
          "entityType": "DEVICE"
        },
        "originatorName": "HUMID1-CABINET-01",
        "severity": "WARNING",
        "status": "ACTIVE_UNACK",
        "ackTs": 0,
        "clearTs": 0,
        "details": {
          "current_rh": 63.8,
          "threshold_min": 65.0,
          "recommendation": "Inspect sponge reservoir or refill Boveda packs"
        }
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "hasNext": false
  }
  ```

---

### 6.2 Acknowledge Alarm
Marks an active alarm as acknowledged by the user.

- **Endpoint:** `POST https://app.humid1.com/api/alarm/e4f8a000-a10b-11f1-9abc-00163eabcdef/ack`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "id": {
      "id": "e4f8a000-a10b-11f1-9abc-00163eabcdef",
      "entityType": "ALARM"
    },
    "status": "ACTIVE_ACK",
    "ackTs": 1788055210000
  }
  ```

---

### 6.3 Clear Alarm
Clears an alarm manually or verifies rule-engine resolution.

- **Endpoint:** `POST https://app.humid1.com/api/alarm/e4f8a000-a10b-11f1-9abc-00163eabcdef/clear`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "id": {
      "id": "e4f8a000-a10b-11f1-9abc-00163eabcdef",
      "entityType": "ALARM"
    },
    "status": "CLEARED_ACK",
    "clearTs": 1788055220000
  }
  ```

---

## 7. OTA (Over-The-Air) Firmware Updates

### 7.1 List Available OTA Firmware Packages
Fetches firmware binaries ready for deployment.

- **Endpoint:** `GET https://app.humid1.com/api/otaPackages/DEVICE?type=FIRMWARE&pageSize=10&page=0&sortProperty=title&sortOrder=DESC`
- **Headers:**
  ```http
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": {
          "id": "f5a12000-a10b-11f1-8123-00163e998877",
          "entityType": "OTA_PACKAGE"
        },
        "createdTime": 1787800000000,
        "type": "FIRMWARE",
        "title": "HUMID1 ESP32 Production Binary",
        "version": "v1.2.0",
        "fileName": "humid1_firmware_v1.2.0.bin",
        "checksumAlgorithm": "SHA256",
        "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "dataSize": 1428570
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "hasNext": false
  }
  ```

---

### 7.2 Assign Firmware to Device
Assigns an OTA firmware binary to a device to trigger a background update on its next wake cycle.

- **Endpoint:** `POST https://app.humid1.com/api/device`
- **Headers:**
  ```http
  Content-Type: application/json
  X-Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
  ```
- **Request Body:**
  ```json
  {
    "id": {
      "id": "78a9c000-a10b-11f1-8a90-00163e123456",
      "entityType": "DEVICE"
    },
    "name": "HUMID1-CABINET-01",
    "type": "HUMIDOR_MONITOR",
    "firmwareId": {
      "id": "f5a12000-a10b-11f1-8123-00163e998877",
      "entityType": "OTA_PACKAGE"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": {
      "id": "78a9c000-a10b-11f1-8a90-00163e123456",
      "entityType": "DEVICE"
    },
    "name": "HUMID1-CABINET-01",
    "type": "HUMIDOR_MONITOR",
    "firmwareId": {
      "id": "f5a12000-a10b-11f1-8123-00163e998877",
      "entityType": "OTA_PACKAGE"
    }
  }
  ```

---

### 7.3 Device Firmware Status Telemetry
Reported by the ESP32 to ThingsBoard during OTA flashing:

- **Attributes/Telemetry Ingest (`POST /api/v1/{ACCESS_TOKEN}/telemetry`):**
  ```json
  {
    "values": {
      "fw_state": "DOWNLOADING",
      "fw_title": "HUMID1 ESP32 Production Binary",
      "fw_version": "v1.2.0",
      "fw_progress": 48,
      "fw_error": null
    }
  }
  ```
- **Final Verification State on Reboot:**
  ```json
  {
    "values": {
      "fw_state": "VERIFIED",
      "fw_version": "v1.2.0",
      "fw_progress": 100
    }
  }
  ```
