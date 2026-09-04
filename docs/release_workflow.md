# HUMID1_OS - Git Branching & CI/CD Release Workflow

## 1. Branching Strategy (Trunk-Based with Semantic Tags)

We use a lightweight, tag-driven Trunk-Based workflow:

```
feature/branch ──> PR / Code Review ──> main (Protected)
                                          │
                                          ├── Tag: v1.2.0 (Triggers Web PWA & Android TWA Build)
                                          │
                                          ├── Tag: fw-v1.2.0 (Triggers ESP32 Firmware Build & ThingsBoard OTA Push)
                                          │
                                          └── Tag: audio-v1.2.0 (Triggers Audio Manifest & Asset Sync)
```

- **`main`**: Protected branch. Requires passing CI checks (linting, typechecks, compilation) and PR approvals before merging.
- **`feature/*` / `fix/*`**: Ephemeral branches branched off `main`.
- **Release Tags**:
  - `vX.Y.Z` $\rightarrow$ Web App / PWA / Android TWA releases.
  - `fw-vX.Y.Z` $\rightarrow$ ESP32 Microcontroller firmware releases.
  - `audio-vX.Y.Z` $\rightarrow$ Audio soundpack & manifest updates.

---

## 2. Firmware Release Pipeline (`fw-vX.Y.Z`)

When a firmware tag is pushed (e.g. `git tag fw-v1.0.4 && git push origin fw-v1.0.4`):

```
[Git Tag: fw-v*] 
       │
       ├──> [GitHub Actions: PlatformIO Build] ──> Compiles firmware.bin
       │
       ├──> [Artifact Verification] ─────────────> Generates SHA-256 checksum & binary size
       │
       ├──> [GitHub Releases] ───────────────────> Publishes release with firmware.bin attached
       │
       └──> [ThingsBoard OTA Package API Push] ──> POST /api/otaPackage
                                                   - Uploads firmware.bin
                                                   - Sets tag = v1.0.4, type = FIRMWARE
```

### GitHub Actions Workflow: `.github/workflows/firmware-release.yml`
```yaml
name: Release Firmware & Push to ThingsBoard OTA

on:
  push:
    tags:
      - 'fw-v*'

jobs:
  build-and-release-firmware:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install PlatformIO
        run: pip install platformio

      - name: Extract Version Tag
        id: vars
        run: echo "FW_VERSION=${GITHUB_REF#refs/tags/fw-}" >> $GITHUB_OUTPUT

      - name: Compile ESP32 Binary
        run: pio run -e esp32dev

      - name: Calculate Checksum & Size
        id: meta
        run: |
          BIN_PATH=".pio/build/esp32dev/firmware.bin"
          echo "CHECKSUM=$(sha256sum $BIN_PATH | awk '{print $1}')" >> $GITHUB_OUTPUT
          echo "SIZE=$(stat -c%s $BIN_PATH)" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: .pio/build/esp32dev/firmware.bin
          body: |
            ### HUMID1_OS Firmware ${{ steps.vars.outputs.FW_VERSION }}
            - **Binary:** `firmware.bin`
            - **SHA-256:** `${{ steps.meta.outputs.CHECKSUM }}`
            - **Size:** `${{ steps.meta.outputs.SIZE }} bytes`

      - name: Upload Binary to ThingsBoard OTA
        env:
          TB_URL: ${{ secrets.THINGSBOARD_SERVER_URL }}
          TB_TOKEN: ${{ secrets.THINGSBOARD_ADMIN_JWT }}
        run: |
          # 1. Create OTA Package Entry
          PACKAGE_ID=$(curl -s -X POST "$TB_URL/api/otaPackage" \
            -H "X-Authorization: Bearer $TB_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
              "title": "HUMID1_OS '${{ steps.vars.outputs.FW_VERSION }}'",
              "version": "'${{ steps.vars.outputs.FW_VERSION }}'",
              "type": "FIRMWARE",
              "hasData": false
            }' | jq -r '.id.id')

          # 2. Upload the Binary
          curl -X POST "$TB_URL/api/otaPackage/$PACKAGE_ID?checksum=${{ steps.meta.outputs.CHECKSUM }}&checksumAlgorithm=SHA256" \
            -H "X-Authorization: Bearer $TB_TOKEN" \
            -F "file=@.pio/build/esp32dev/firmware.bin"
```

---

## 3. Web App, PWA & Android TWA Release Pipeline (`vX.Y.Z`)

When a web app tag is pushed (e.g. `git tag v1.0.4 && git push origin v1.0.4`):

```
[Git Tag: v*]
       │
       ├──> [Vite Build & Typecheck] ────────────> Generates /dist (HTML/JS/CSS + PWA Manifest)
       │
       ├──> [Deploy Web / PWA to Caddy Host] ────> Rsync / S3 / Static Web Server
       │
       └──> [Build Android TWA APK via Bubblewrap]
             │
             ├──> Verify .well-known/assetlinks.json against keystore SHA-256
             └──> Output unsigned & signed .apk / .aab artifacts to GitHub Releases
```

### GitHub Actions Workflow: `.github/workflows/android-twa.yml`
```yaml
name: Build Android TWA (APK & AAB)

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      build_bundle:
        description: 'Build Google Play Android App Bundle (.aab)'
        required: true
        type: boolean
        default: true
      skip_pwa_validation:
        description: 'Skip live PWA origin validation during build'
        required: true
        type: boolean
        default: true

jobs:
  build-android-twa:
    name: Build Android TWA APK & AAB
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Validate & Build Web PWA
        run: npm run build

      - name: Setup Java (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK Tools
        uses: android-actions/setup-android@v3

      - name: Install Bubblewrap CLI
        run: npm install -g @bubblewrap/cli

      - name: Configure Keystore for Signing
        id: keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KEYSTORE_PASS: ${{ secrets.ANDROID_KEYSTORE_PASS || 'humid1pass' }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS || 'humid1-key' }}
          KEY_PASS: ${{ secrets.ANDROID_KEY_PASS || 'humid1pass' }}
        run: |
          mkdir -p android-build
          if [ -n "$KEYSTORE_BASE64" ]; then
            echo "$KEYSTORE_BASE64" | base64 -d > android-build/android-keystore.jks
          else
            keytool -genkey -v -keystore android-build/android-keystore.jks \
              -alias "$KEY_ALIAS" \
              -keyalg RSA -keysize 2048 -validity 10000 \
              -storepass "$KEYSTORE_PASS" -keypass "$KEY_PASS" \
              -dname "CN=HUMID1, OU=Engineering, O=HUMID1 Systems, L=Denver, S=CO, C=US"
          fi

      - name: Build Android TWA Project with Bubblewrap
        run: |
          cp twa-manifest.json android-build/
          cd android-build
          bubblewrap build --manifest=twa-manifest.json --skipPwaValidation

      - name: Build Android App Bundle (.aab)
        if: github.event.inputs.build_bundle != 'false'
        run: |
          cd android-build
          bubblewrap build --manifest=twa-manifest.json --skipPwaValidation --bundle || true

      - name: Upload APK & AAB Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: humid1-android-twa-artifacts
          path: output/
          retention-days: 14

      - name: Attach APK and AAB to GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: output/*
```

---

## 4. Audio Assets & Manifest Sync Pipeline (`audio-vX.Y.Z`)

When sound packs or prompt audio files are updated:

1. **Calculate Hashes:** Compute MD5 / SHA-256 checksums and file sizes for all `.mp3` files in `/audio/`.
2. **Auto-Generate `manifest.json`:**
   ```json
   {
     "version": "1.0.2",
     "generated_at": 1788055200,
     "files": [
       {
         "name": "humidity_low.mp3",
         "size": 24520,
         "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
       },
       {
         "name": "humidity_critical.mp3",
         "size": 31200,
         "sha256": "5c92c90666042a694317a66cd5f553a15ec97011d31a5eb23b0365774a382ca5"
       }
     ]
   }
   ```
3. **Deploy to CDN / Caddy Server:** Upload `/audio/` files and `manifest.json` directly to `https://humid1.com/audio/` so ESP32 devices can sync the new soundpack.

---

## 5. Release Checklist for Developers

- [ ] **Firmware Release:** Bump `VERSION` in `platformio.ini` $\rightarrow$ Merge to `main` $\rightarrow$ Run `git tag fw-vX.Y.Z && git push origin fw-vX.Y.Z`.
- [ ] **Web / App Release:** Bump `version` in `package.json` $\rightarrow$ Merge to `main` $\rightarrow$ Run `git tag vX.Y.Z && git push origin vX.Y.Z`.
- [ ] **Audio Release:** Add/update `.mp3` files $\rightarrow$ Merge to `main` $\rightarrow$ Run `git tag audio-vX.Y.Z && git push origin audio-vX.Y.Z`.

---

### How Everything Connects
1. **Developer pushes tag `fw-v1.0.5`** $\rightarrow$ GitHub Actions builds the ESP32 binary and pushes it directly into ThingsBoard's OTA Package manager.
2. **Developer pushes tag `v1.0.5`** $\rightarrow$ GitHub Actions compiles the PWA, deploys it to your Caddy static web folder, builds the Android APK, and attaches the APK to the GitHub Release.
3. **User opens the Web App / Android TWA** $\rightarrow$ Sees new firmware available, clicks **"Push OTA Update Now"**, and the device updates on its next wake cycle!