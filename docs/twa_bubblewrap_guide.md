# HUMID1_OS — Android Trusted Web Activity (TWA) & Bubblewrap Build Guide

This guide details how to package the **HUMID1_OS Progressive Web App** (`dash.humid1.com`) into a native Android application (`.aab` and `.apk`) for the Google Play Store using **Google's Bubblewrap CLI tool**.

---

## 1. Overview & Prerequisites

A **Trusted Web Activity (TWA)** wraps your PWA in a native Android shell powered by Chrome Custom Tabs. When **Digital Asset Links** verification passes, the browser address bar is completely removed, providing a 100% full-screen native Android experience with hardware acceleration and push notifications.

### Prerequisites:
- **Node.js**: v18+ or v20+
- **Java Development Kit (JDK)**: JDK 17 or JDK 21 (Bubblewrap can install this automatically)
- **Android SDK**: Android command-line tools (Bubblewrap can install this automatically)
- **Production URL**: `https://dash.humid1.com`

---

## 2. Bubblewrap Installation & Project Initialization

### Step 1: Install Bubblewrap CLI Globally
```bash
npm install -g @bubblewrap/cli
```

### Step 2: Initialize from Web App Manifest
Run the following command in an empty directory or Android build subfolder:

```bash
bubblewrap init --manifest=https://dash.humid1.com/manifest.webmanifest
```

Bubblewrap will read `twa-manifest.json` / `manifest.webmanifest` and prompt for key configuration parameters:

| Prompt | Value | Description |
| :--- | :--- | :--- |
| **Domain** | `dash.humid1.com` | Hostname of the PWA |
| **Package ID** | `com.humid1.app` | Android Application Package Name |
| **App Name** | `HUMID1 Humidor OS` | Display name in app drawer |
| **Launcher Name** | `HUMID1` | Short name under the app icon |
| **Theme Color** | `#0f172a` | Android Status Bar Color |
| **Background Color**| `#0f172a` | Splash Screen Color |
| **Start URL** | `/` | Entry path |
| **Display Mode** | `standalone` | Hides browser address bar |
| **Icon URL** | `https://dash.humid1.com/pwa-512x512.png` | 512x512 Master App Icon |
| **Maskable Icon URL**| `https://dash.humid1.com/pwa-maskable-512x512.png` | Android Adaptive Maskable Icon |

---

## 3. Signing Key & Digital Asset Links Verification

To remove the URL address bar in Android, Google Play requires mutual verification between your web domain and Android signing certificate.

### Step 1: Generate or Locate Signing Keystore
Bubblewrap will generate an Android keystore (or you can use your existing upload key):
```bash
# Example Keystore details:
# Keystore Path: ./android-keystore.jks
# Key Alias: humid1-key
```

### Step 2: Extract SHA-256 Certificate Fingerprint
Run `keytool` to inspect your keystore fingerprint:
```bash
keytool -list -v -keystore ./android-keystore.jks -alias humid1-key
```
Look for the `SHA256:` line (e.g., `14:6D:E9:44:C5:4F:57:3E:86:70:9B:04:A9:7A:B4:73:24:D3:85:6A:E8:27:07:90:7D:66:E8:86:14:46:1D:95`).

### Step 3: Verify `assetlinks.json` on Server
Ensure `https://dash.humid1.com/.well-known/assetlinks.json` responds with `Content-Type: application/json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.humid1.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:44:C5:4F:57:3E:86:70:9B:04:A9:7A:B4:73:24:D3:85:6A:E8:27:07:90:7D:66:E8:86:14:46:1D:95"
      ]
    }
  }
]
```

> **Google Play App Signing Note:** If you enroll in Google Play App Signing, copy the **App Signing SHA-256 certificate fingerprint** from the Google Play Console (`Release > Setup > App Integrity`) and add it to the `sha256_cert_fingerprints` array in `assetlinks.json`.

---

## 4. Building the Native Android Artifacts

### Build Debug APK (For Local Device Sideloading)
```bash
bubblewrap build
```
This produces `app-release-unsigned.apk` or signed debug APK.

### Sideload Test onto Connected Android Phone
```bash
# Enable USB Debugging on your Android phone, then:
adb install -r app-release-signed.apk
```

### Build Production Android App Bundle (`.aab`) for Google Play
```bash
bubblewrap build --bundle
```
Output:
- `app-release-signed.aab` (Upload this file directly to Google Play Console).

---

## 5. Testing & Verification

1. **Address Bar Check**: Launch the app on Android. If the top URL bar does not appear and only your dark `#0f172a` status bar is visible, Digital Asset Links verification has succeeded!
2. **Push Notifications**: When a climate alarm fires or you tap **Test Push Alert** in the dashboard, Android displays the notification with the HUMID1 app icon.
3. **Deep Links**: Tapping `https://dash.humid1.com` links anywhere on Android will open directly inside the HUMID1 native app.
