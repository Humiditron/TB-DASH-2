import { HumidorDevice, HumidorAlarm, ThingsBoardConfig, HistoricalTelemetryPoint, SharedAttributes } from '../types';
import { normalizeUrl } from '../utils/url';
import { getEnv } from '../utils/env';

const CONFIG_STORAGE_KEY = 'humid1_thingsboard_config';

export const DEFAULT_THINGSBOARD_URL = 'https://app.humid1.com';
export const DEFAULT_AUTHENTIK_URL = 'https://auth.humid1.com';
export const DEFAULT_APP_SLUG = 'humid1-dash';
export const DEFAULT_CLIENT_ID = '7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authority?: string;
  customerId?: { id: string };
}

class ThingsBoardService {
  private config: ThingsBoardConfig;
  private authToken: string | null = null;
  private devices: HumidorDevice[] = [];
  private alarms: HumidorAlarm[] = [];
  private subscribers: Array<(devices: HumidorDevice[], alarms: HumidorAlarm[]) => void> = [];
  private authSubscribers: Array<(profile: UserProfile | null, token: string | null) => void> = [];
  private currentUser: UserProfile | null = null;
  private livePollInterval: number | null = null;

  constructor() {
    this.purgeLegacyStorage();
    this.config = this.loadConfig();
    this.authToken = this.findAutomaticJwt();
    if (this.authToken) {
      this.extractProfileFromJwt(this.authToken);
    }
  }

  /**
   * Automatically discovers the active JWT token from OIDC session storage,
   * URL parameters, or environment variables.
   */
  public findAutomaticJwt(): string | null {
    if (this.authToken && this.authToken.trim()) {
      return this.authToken.trim();
    }

    if (typeof window !== 'undefined') {
      // 1. Scan window.location query & hash for tokens passed during redirect
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const queryToken =
          urlParams.get('token') ||
          urlParams.get('access_token') ||
          urlParams.get('jwt') ||
          urlParams.get('id_token') ||
          hashParams.get('access_token') ||
          hashParams.get('id_token') ||
          hashParams.get('token');

        if (queryToken && queryToken.trim()) {
          return queryToken.trim();
        }
      } catch {
        // ignore
      }

      // 2. Scan sessionStorage for oidc-client user objects
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && (key.startsWith('oidc.user:') || key.includes('authentik') || key.includes('thingsboard'))) {
            const rawVal = window.sessionStorage.getItem(key);
            if (rawVal) {
              try {
                const parsed = JSON.parse(rawVal);
                const candidate = parsed.access_token || parsed.id_token || parsed.token;
                if (candidate && typeof candidate === 'string' && candidate.length > 20) {
                  return candidate.trim();
                }
              } catch {
                if (rawVal.length > 20 && rawVal.includes('.')) {
                  return rawVal.trim();
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }

      // 3. Scan localStorage for any stored OIDC sessions or tokens
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('oidc.user:') || key.includes('authentik_token') || key.includes('tb_token') || key === 'humid1_active_jwt')) {
            const rawVal = window.localStorage.getItem(key);
            if (rawVal) {
              try {
                const parsed = JSON.parse(rawVal);
                const candidate = parsed.access_token || parsed.id_token || parsed.token;
                if (candidate && typeof candidate === 'string') {
                  return candidate.trim();
                }
              } catch {
                if (rawVal.length > 20 && rawVal.includes('.')) {
                  return rawVal.trim();
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const envToken = getEnv('VITE_THINGSBOARD_TOKEN', '');
    if (envToken && envToken.trim()) {
      return envToken.trim();
    }

    return null;
  }

  private purgeLegacyStorage() {
    try {
      localStorage.removeItem('humid1_devices_state');
      localStorage.removeItem('humid1_alarms_state');
      localStorage.removeItem('humid1_demo_mode');
    } catch {
      // ignore
    }
  }

  public getConfig(): ThingsBoardConfig {
    return { ...this.config };
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Called when Authentik OIDC authenticates or user signs in.
   */
  public async setAuthSession(token: string | null, profile?: any): Promise<void> {
    if (!token) {
      this.authToken = null;
      this.currentUser = null;
      this.devices = [];
      this.alarms = [];
      this.stopLivePolling();
      try {
        localStorage.removeItem('humid1_active_jwt');
      } catch {
        // ignore
      }
      this.notifyAuth();
      this.notifySubscribers();
      return;
    }

    this.authToken = token.trim();
    this.config.isConnected = true;
    try {
      localStorage.setItem('humid1_active_jwt', this.authToken);
    } catch {
      // ignore
    }

    if (profile) {
      this.setOidcProfile(profile);
    } else {
      this.extractProfileFromJwt(this.authToken);
    }

    this.notifyAuth();
    this.initRealBackend();
  }

  private setOidcProfile(profile: any) {
    this.currentUser = {
      id: profile.sub || profile.id || 'authenticated_user',
      email: profile.email || profile.preferred_username || profile.name || 'User',
      firstName: profile.given_name || profile.name || '',
      lastName: profile.family_name || '',
      authority: profile.iss?.includes('auth') ? 'AUTHENTIK_SSO' : 'CUSTOMER_USER',
    };
  }

  public extractProfileFromJwt(jwtToken: string) {
    try {
      const payloadBase64 = jwtToken.split('.')[1];
      if (payloadBase64) {
        const decodedJson = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        this.currentUser = {
          id: decodedJson.sub || decodedJson.userId || 'authentik_user',
          email: decodedJson.email || decodedJson.preferred_username || decodedJson.sub || 'User',
          firstName: decodedJson.name || decodedJson.given_name || decodedJson.firstName || '',
          lastName: decodedJson.family_name || decodedJson.lastName || '',
          authority: decodedJson.iss?.includes('auth') ? 'AUTHENTIK_SSO' : (decodedJson.scopes?.[0] || 'CUSTOMER_USER'),
        };
      }
    } catch {
      // ignore
    }
  }

  public async loginWithCredentials(username: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    try {
      const res = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        return { success: false, error: errJson?.message || `Login failed (status ${res.status})` };
      }

      const data = await res.json();
      if (data.token) {
        await this.setAuthSession(data.token);
        return { success: true };
      }
      return { success: false, error: 'No token returned by ThingsBoard' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to connect to ThingsBoard server' };
    }
  }

  public subscribeAuth(callback: (profile: UserProfile | null, token: string | null) => void): () => void {
    this.authSubscribers.push(callback);
    callback(this.currentUser, this.authToken);
    return () => {
      this.authSubscribers = this.authSubscribers.filter((s) => s !== callback);
    };
  }

  private notifyAuth() {
    this.authSubscribers.forEach((cb) => cb(this.currentUser, this.authToken));
  }

  public subscribe(callback: (devices: HumidorDevice[], alarms: HumidorAlarm[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.devices, this.alarms);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => cb([...this.devices], [...this.alarms]));
  }

  public getDevices(): HumidorDevice[] {
    return [...this.devices];
  }

  public getAlarms(): HumidorAlarm[] {
    return [...this.alarms];
  }

  public saveConfig(newConfig: Partial<ThingsBoardConfig>): ThingsBoardConfig {
    this.config = {
      ...this.config,
      ...newConfig,
      serverUrl: newConfig.serverUrl !== undefined ? normalizeUrl(newConfig.serverUrl) : this.config.serverUrl,
      thingsboardToken: newConfig.thingsboardToken !== undefined ? newConfig.thingsboardToken.trim() : this.config.thingsboardToken,
      authentikUrl: newConfig.authentikUrl !== undefined ? normalizeUrl(newConfig.authentikUrl) : this.config.authentikUrl,
      authentikClientId: newConfig.authentikClientId !== undefined ? newConfig.authentikClientId.trim() : this.config.authentikClientId,
      authentikAppSlug: newConfig.authentikAppSlug !== undefined ? newConfig.authentikAppSlug.trim() : this.config.authentikAppSlug,
    };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }

    this.initRealBackend();
    this.notifyAuth();
    this.notifySubscribers();
    return this.config;
  }

  private loadConfig(): ThingsBoardConfig {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          serverUrl: normalizeUrl(parsed.serverUrl || getEnv('VITE_THINGSBOARD_URL', DEFAULT_THINGSBOARD_URL)),
          thingsboardToken: parsed.thingsboardToken || getEnv('VITE_THINGSBOARD_TOKEN', ''),
          authentikUrl: normalizeUrl(parsed.authentikUrl || getEnv('VITE_AUTHENTIK_URL', DEFAULT_AUTHENTIK_URL)),
          authentikClientId: parsed.authentikClientId || getEnv('VITE_AUTHENTIK_CLIENT_ID', DEFAULT_CLIENT_ID),
          authentikAppSlug: parsed.authentikAppSlug || getEnv('VITE_AUTHENTIK_APP_SLUG', DEFAULT_APP_SLUG),
          isDemoMode: false,
          isConnected: false,
        };
      }
    } catch {
      // fallback
    }

    return {
      serverUrl: normalizeUrl(getEnv('VITE_THINGSBOARD_URL', DEFAULT_THINGSBOARD_URL)),
      thingsboardToken: getEnv('VITE_THINGSBOARD_TOKEN', ''),
      authentikUrl: normalizeUrl(getEnv('VITE_AUTHENTIK_URL', DEFAULT_AUTHENTIK_URL)),
      authentikClientId: getEnv('VITE_AUTHENTIK_CLIENT_ID', DEFAULT_CLIENT_ID),
      authentikAppSlug: getEnv('VITE_AUTHENTIK_APP_SLUG', DEFAULT_APP_SLUG),
      isDemoMode: false,
      isConnected: false,
    };
  }

  public getEffectiveToken(): string | null {
    if (this.authToken && this.authToken.trim()) {
      return this.authToken.trim();
    }
    const autoToken = this.findAutomaticJwt();
    if (autoToken) {
      this.authToken = autoToken;
      return autoToken;
    }
    if (this.config.thingsboardToken && this.config.thingsboardToken.trim()) {
      return this.config.thingsboardToken.trim();
    }
    return null;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const effectiveToken = this.getEffectiveToken();
    if (effectiveToken) {
      headers['X-Authorization'] = `Bearer ${effectiveToken}`;
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    return headers;
  }

  public initRealBackend() {
    this.stopLivePolling();
    if (!this.getEffectiveToken()) return;

    this.fetchUserProfile().catch(() => {});
    this.fetchRealDevices();
    this.fetchRealAlarms();

    this.livePollInterval = window.setInterval(() => {
      if (this.getEffectiveToken()) {
        this.fetchRealDevices();
        this.fetchRealAlarms();
      }
    }, 10000);
  }

  public stopLivePolling() {
    if (this.livePollInterval) {
      clearInterval(this.livePollInterval);
      this.livePollInterval = null;
    }
  }

  public async fetchUserProfile(): Promise<UserProfile | null> {
    const token = this.getEffectiveToken();
    if (!token) return this.currentUser;
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    if (!serverUrl) return this.currentUser;

    try {
      const res = await fetch(`${serverUrl}/api/auth/user`, {
        headers: this.getAuthHeaders(),
      });

      if (res.ok) {
        const user = await res.json();
        this.currentUser = {
          id: user.id?.id || user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          authority: user.authority,
          customerId: user.customerId,
        };
        this.notifyAuth();
        return this.currentUser;
      }
    } catch {
      // Keep OIDC profile if ThingsBoard /api/auth/user is not reachable
    }
    return this.currentUser;
  }

  public async fetchRealDevices(): Promise<HumidorDevice[]> {
    const effectiveToken = this.getEffectiveToken();
    if (!effectiveToken) {
      this.devices = [];
      this.notifySubscribers();
      return [];
    }

    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    if (!serverUrl) return [];

    try {
      let rawDevices: any[] = [];

      const endpoints = [
        '/api/user/devices?pageSize=100&page=0',
        '/api/customer/deviceInfos?pageSize=100&page=0',
        '/api/customer/devices?pageSize=100&page=0',
        '/api/tenant/deviceInfos?pageSize=100&page=0',
        '/api/tenant/devices?pageSize=100&page=0',
      ];

      for (const ep of endpoints) {
        try {
          const res = await fetch(`${serverUrl}${ep}`, {
            headers: this.getAuthHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.data || (Array.isArray(data) ? data : []);
            if (list.length > 0) {
              rawDevices = list;
              break;
            }
          }
        } catch {
          // ignore and continue
        }
      }

      if (rawDevices.length === 0) {
        this.devices = [];
        this.notifySubscribers();
        return [];
      }

      const enrichedDevices: HumidorDevice[] = await Promise.all(
        rawDevices.map(async (dev: any) => {
          const devId = dev.id?.id || dev.id;
          const devName = dev.name || 'Humidor Unit';
          const devLabel = dev.label || devName;

          let telemetry = {
            rh: 0,
            temp: 0,
            battery: 100,
            rssi: -50,
            timestamp: dev.createdTime || Date.now(),
          };

          let clientAttr = {
            fw_version: 'v1.0.0',
            device_name: devName,
            mac_address: 'N/A',
            ssid: 'Wi-Fi',
            ip_address: 'N/A',
            has_sd_card: true,
            audio_synced: true,
          };

          let sharedAttr: SharedAttributes = {
            sleep_interval_sec: 900,
            device_theme: 'DARK',
            sound_enabled: true,
            auto_update_enabled: true,
            manual_ota_trigger: false,
          };

          // Fetch real latest timeseries
          try {
            const telRes = await fetch(
              `${serverUrl}/api/plugins/telemetry/DEVICE/${devId}/values/timeseries?keys=rh,temp,battery,rssi,humidity,temperature`,
              { headers: this.getAuthHeaders() }
            );
            if (telRes.ok) {
              const telData = await telRes.json();
              let rhVal = 0;
              let tempVal = 0;

              if (telData.rh?.[0]) rhVal = parseFloat(telData.rh[0].value);
              else if (telData.humidity?.[0]) rhVal = parseFloat(telData.humidity[0].value);

              if (telData.temp?.[0]) tempVal = parseFloat(telData.temp[0].value);
              else if (telData.temperature?.[0]) tempVal = parseFloat(telData.temperature[0].value);

              telemetry.rh = rhVal;
              telemetry.temp = tempVal;

              if (telData.battery?.[0]) telemetry.battery = parseFloat(telData.battery[0].value);
              if (telData.rssi?.[0]) telemetry.rssi = parseFloat(telData.rssi[0].value);

              const ts = telData.rh?.[0]?.ts || telData.temp?.[0]?.ts || telData.humidity?.[0]?.ts;
              if (ts) telemetry.timestamp = ts;
            }
          } catch {
            // ignore
          }

          // Fetch real attributes
          try {
            const attrRes = await fetch(
              `${serverUrl}/api/plugins/telemetry/DEVICE/${devId}/values/attributes`,
              { headers: this.getAuthHeaders() }
            );
            if (attrRes.ok) {
              const attrData = await attrRes.json();
              attrData.forEach((a: any) => {
                if (a.key in clientAttr) (clientAttr as any)[a.key] = a.value;
                if (a.key in sharedAttr) (sharedAttr as any)[a.key] = a.value;
              });
            }
          } catch {
            // ignore
          }

          const isOnline = Date.now() - telemetry.timestamp < 1800 * 1000;

          return {
            id: devId,
            name: devLabel,
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            lastActivityTime: telemetry.timestamp,
            latestFwAvailable: 'v1.2.0',
            telemetry,
            clientAttributes: clientAttr,
            sharedAttributes: sharedAttr,
            fw_state: 'IDLE' as const,
            fw_progress: 0,
          };
        })
      );

      this.devices = enrichedDevices;
      this.notifySubscribers();
      return this.devices;
    } catch (err) {
      console.warn('Failed to fetch devices from ThingsBoard API:', err);
      this.devices = [];
      this.notifySubscribers();
      return [];
    }
  }

  public async fetchRealAlarms(): Promise<HumidorAlarm[]> {
    const token = this.getEffectiveToken();
    if (!token) {
      this.alarms = [];
      this.notifySubscribers();
      return [];
    }

    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    if (!serverUrl) return [];

    try {
      const res = await fetch(
        `${serverUrl}/api/alarms?pageSize=50&page=0&sortProperty=createdTime&sortOrder=DESC`,
        { headers: this.getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        const rawAlarms = data.data || [];
        this.alarms = rawAlarms.map((a: any) => ({
          id: a.id?.id || a.id,
          deviceId: a.originator?.id || 'unknown',
          deviceName: a.originatorName || 'Humidor Unit',
          severity: a.severity || 'WARNING',
          type: a.type || 'SYSTEM_WARNING',
          details: a.details?.message || a.type || 'Telemetry Alarm',
          createdTime: a.createdTime || Date.now(),
          status: a.status || 'ACTIVE_UNACK',
        }));
        this.notifySubscribers();
        return this.alarms;
      }
    } catch (err) {
      console.warn('Failed to fetch alarms from ThingsBoard API:', err);
    }
    return this.alarms;
  }

  public async claimDevice(deviceName: string, secretKey: string): Promise<HumidorDevice> {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (!token || !serverUrl) {
      throw new Error('Not connected to ThingsBoard. Please check server settings.');
    }

    const cleanDeviceName = deviceName.trim();
    const cleanSecret = secretKey ? secretKey.trim() : '';
    const payload = cleanSecret ? { secretKey: cleanSecret } : { secretKey: '' };

    let claimRes = await fetch(`${serverUrl}/api/customer/device/${encodeURIComponent(cleanDeviceName)}/claim`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!claimRes.ok && (claimRes.status === 404 || claimRes.status === 405)) {
      claimRes = await fetch(`${serverUrl}/api/customer/device/claim`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          deviceName: cleanDeviceName,
          secretKey: cleanSecret,
        }),
      });
    }

    let claimJson: any = null;
    try {
      claimJson = await claimRes.json();
    } catch {
      // ignore
    }

    if (!claimRes.ok) {
      if (claimRes.status === 401) {
        throw new Error(
          'ThingsBoard Authentication Failed (401): The server rejected the session token. Please verify your ThingsBoard API Access Token in Server Settings.'
        );
      }
      if (claimRes.status === 403) {
        throw new Error(
          'ThingsBoard Permission Denied (403): Only Customer accounts can claim devices, or this device is already owned.'
        );
      }
      if (claimRes.status === 404) {
        throw new Error(
          `Device "${cleanDeviceName}" was not found on ThingsBoard. Ensure vrpc.py or ESP32 is running and has provisioned.`
        );
      }
      const errMsg = claimJson?.message || `ThingsBoard claim rejected with status ${claimRes.status}`;
      throw new Error(errMsg);
    }

    if (claimJson && claimJson.response === 'FAILURE') {
      throw new Error(
        `Claim verification failed: ThingsBoard rejected the claim for "${cleanDeviceName}". Verify that the device is running and the secret PIN matches.`
      );
    }

    const updatedDevices = await this.fetchRealDevices();
    const matched = updatedDevices.find((d) => d.name.toLowerCase() === cleanDeviceName.toLowerCase());
    if (matched) return matched;
    if (updatedDevices.length > 0) return updatedDevices[0];

    if (claimJson?.device) {
      const dev = claimJson.device;
      const devId = dev.id?.id || dev.id;
      const newDev: HumidorDevice = {
        id: devId,
        name: dev.name || cleanDeviceName,
        status: 'ONLINE',
        lastActivityTime: Date.now(),
        latestFwAvailable: 'v1.2.0',
        fw_state: 'IDLE',
        fw_progress: 0,
        telemetry: { rh: 70, temp: 72, battery: 95, rssi: -55, timestamp: Date.now() },
        clientAttributes: {
          fw_version: 'v1.0.4',
          device_name: cleanDeviceName,
          mac_address: 'N/A',
          ssid: 'Wi-Fi',
          ip_address: 'N/A',
          has_sd_card: true,
          audio_synced: true,
        },
        sharedAttributes: {
          sleep_interval_sec: 900,
          device_theme: 'DARK',
          sound_enabled: true,
          auto_update_enabled: true,
          manual_ota_trigger: false,
        },
      };
      this.devices.push(newDev);
      this.notifySubscribers();
      return newDev;
    }

    throw new Error('Device claimed, waiting for initial telemetry packet from ThingsBoard.');
  }

  public async unclaimDevice(deviceName: string): Promise<boolean> {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (!token || !serverUrl) {
      throw new Error('Not connected to ThingsBoard.');
    }

    const cleanDeviceName = deviceName.trim();
    const res = await fetch(`${serverUrl}/api/customer/device/${encodeURIComponent(cleanDeviceName)}/claim`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok && res.status !== 200 && res.status !== 204) {
      let errMsg = `Failed to unclaim device (status ${res.status})`;
      try {
        const json = await res.json();
        if (json.message) errMsg = json.message;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    this.devices = this.devices.filter((d) => d.name.toLowerCase() !== cleanDeviceName.toLowerCase());
    this.notifySubscribers();
    return true;
  }

  public async getHistory(deviceId: string, rangeHours: number = 72): Promise<HistoricalTelemetryPoint[]> {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (!token || !serverUrl) return [];

    try {
      const startTs = Date.now() - rangeHours * 3600 * 1000;
      const endTs = Date.now();
      const limit = 500;

      const res = await fetch(
        `${serverUrl}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=rh,temp,battery,humidity,temperature&startTs=${startTs}&endTs=${endTs}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );

      if (res.ok) {
        const data = await res.json();
        const rhPoints: Array<{ ts: number; value: string }> = data.rh || data.humidity || [];
        const tempPoints: Array<{ ts: number; value: string }> = data.temp || data.temperature || [];
        const battPoints: Array<{ ts: number; value: string }> = data.battery || [];

        if (rhPoints.length === 0 && tempPoints.length === 0) {
          return [];
        }

        const timestampMap = new Map<number, { rh: number; temp: number; battery: number }>();

        rhPoints.forEach((p) => {
          const bucket = Math.round(p.ts / (15 * 60 * 1000)) * (15 * 60 * 1000);
          const entry = timestampMap.get(bucket) || { rh: parseFloat(p.value), temp: 0, battery: 100 };
          entry.rh = parseFloat(p.value);
          timestampMap.set(bucket, entry);
        });

        tempPoints.forEach((p) => {
          const bucket = Math.round(p.ts / (15 * 60 * 1000)) * (15 * 60 * 1000);
          const entry = timestampMap.get(bucket) || { rh: 0, temp: parseFloat(p.value), battery: 100 };
          entry.temp = parseFloat(p.value);
          timestampMap.set(bucket, entry);
        });

        battPoints.forEach((p) => {
          const bucket = Math.round(p.ts / (15 * 60 * 1000)) * (15 * 60 * 1000);
          const entry = timestampMap.get(bucket) || { rh: 0, temp: 0, battery: parseFloat(p.value) };
          entry.battery = parseFloat(p.value);
          timestampMap.set(bucket, entry);
        });

        const sorted: HistoricalTelemetryPoint[] = Array.from(timestampMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([ts, val]) => {
            const d = new Date(ts);
            const hours = d.getHours().toString().padStart(2, '0');
            const minutes = d.getMinutes().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return {
              timestamp: ts,
              timeLabel: `${month}/${day} ${hours}:${minutes}`,
              rh: val.rh,
              temp: val.temp,
              battery: val.battery,
            };
          });

        return sorted;
      }
    } catch (err) {
      console.warn('Failed to fetch real telemetry history:', err);
    }

    return [];
  }

  public async updateSharedAttributes(deviceId: string, attributes: Partial<SharedAttributes>): Promise<void> {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (token && serverUrl) {
      try {
        await fetch(`${serverUrl}/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(attributes),
        });
      } catch (err) {
        console.warn('ThingsBoard API Shared Attribute push failed:', err);
      }
    }

    this.devices = this.devices.map((dev) => {
      if (dev.id === deviceId) {
        return {
          ...dev,
          sharedAttributes: { ...dev.sharedAttributes, ...attributes },
        };
      }
      return dev;
    });

    this.notifySubscribers();
  }

  public async triggerManualOta(deviceId: string): Promise<void> {
    await this.updateSharedAttributes(deviceId, { manual_ota_trigger: true });
    this.devices = this.devices.map((d) =>
      d.id === deviceId ? { ...d, fw_state: 'DOWNLOADING', fw_progress: 15 } : d
    );
    this.notifySubscribers();
  }

  public acknowledgeAlarm(alarmId: string) {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (token && serverUrl) {
      fetch(`${serverUrl}/api/alarm/${alarmId}/ack`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    }

    this.alarms = this.alarms.map((alm) => {
      if (alm.id === alarmId) {
        return {
          ...alm,
          status: alm.status === 'CLEARED_UNACK' ? 'CLEARED_ACK' : 'ACTIVE_ACK',
        };
      }
      return alm;
    });
    this.notifySubscribers();
  }

  public clearAlarm(alarmId: string) {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/$/, '');
    const token = this.getEffectiveToken();
    if (token && serverUrl) {
      fetch(`${serverUrl}/api/alarm/${alarmId}/clear`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    }

    this.alarms = this.alarms.map((alm) => {
      if (alm.id === alarmId) {
        return {
          ...alm,
          status: alm.status === 'ACTIVE_ACK' ? 'CLEARED_ACK' : 'CLEARED_UNACK',
        };
      }
      return alm;
    });
    this.notifySubscribers();
  }

  public deleteAlarm(alarmId: string) {
    this.alarms = this.alarms.filter((alm) => alm.id !== alarmId);
    this.notifySubscribers();
  }
}

export const thingsboard = new ThingsBoardService();
