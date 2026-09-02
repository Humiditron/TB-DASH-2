import {
  client,
  claimDevice as apiClaimDevice,
  reClaimDevice as apiReClaimDevice,
  getCustomerDeviceInfos as apiGetCustomerDeviceInfos,
  getCustomerDevices as apiGetCustomerDevices,
  getTenantDeviceInfos as apiGetTenantDeviceInfos,
  getTenantDevices as apiGetTenantDevices,
  getLatestTimeseries as apiGetLatestTimeseries,
  getTimeseriesHistory as apiGetTimeseriesHistory,
  getAttributesByScope as apiGetAttributesByScope,
  saveDeviceAttributes as apiSaveDeviceAttributes,
  getAllAlarmsV2 as apiGetAllAlarmsV2,
  getAllAlarms as apiGetAllAlarms,
  ackAlarm as apiAckAlarm,
  clearAlarm as apiClearAlarm,
  getUser as apiGetUser,
  login as apiLogin,
  logout as apiLogout,
} from '../client/services.gen';
import {
  HumidorDevice,
  HumidorAlarm,
  ThingsBoardConfig,
  HistoricalTelemetryPoint,
  SharedAttributes,
  ClaimLogEntry,
} from '../types';
import { normalizeUrl } from '../utils/url';
import { getEnv } from '../utils/env';
import { apiLogger } from './apiLogger';

const CONFIG_STORAGE_KEY = 'humid1_thingsboard_config';
const CLAIM_LOGS_STORAGE_KEY = 'humid1_tb_claim_logs';

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
  customerId?: { id: string } | string;
}

class ThingsBoardService {
  private config: ThingsBoardConfig;
  private authToken: string | null = null;
  private devices: HumidorDevice[] = [];
  private alarms: HumidorAlarm[] = [];
  private claimLogs: ClaimLogEntry[] = [];
  private subscribers: Array<(devices: HumidorDevice[], alarms: HumidorAlarm[]) => void> = [];
  private authSubscribers: Array<(profile: UserProfile | null, token: string | null) => void> = [];
  private currentUser: UserProfile | null = null;
  private livePollInterval: number | null = null;

  constructor() {
    this.purgeLegacyStorage();
    this.config = this.loadConfig();
    this.loadClaimLogs();
    this.authToken = this.findAutomaticJwt();
    if (this.authToken) {
      this.extractProfileFromJwt(this.authToken);
    }
    this.initOpenApiClient();
  }

  /**
   * Configure the @hey-api OpenAPI client instance from /src_lib/client
   */
  private initOpenApiClient() {
    const serverUrl = (this.config.serverUrl || DEFAULT_THINGSBOARD_URL).replace(/\/+$/, '');
    client.setConfig({
      baseUrl: serverUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Register request interceptor for Bearer token injection & apiLogger
    client.interceptors.request.use((request) => {
      const token = this.getEffectiveToken();
      if (token) {
        request.headers.set('X-Authorization', `Bearer ${token}`);
        request.headers.set('Authorization', `Bearer ${token}`);
      }

      const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
      (request as any).__txId = txId;

      let parsedBody: any = undefined;
      if (request.body) {
        try {
          parsedBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        } catch {
          parsedBody = request.body;
        }
      }

      apiLogger.logRequest(txId, request.method || 'GET', request.url || '', parsedBody);
      return request;
    });

    // Register response interceptor for apiLogger
    client.interceptors.response.use(async (response) => {
      const txId = (response as any).request?.__txId || (response as any).__txId;
      let responseBody: any = undefined;
      try {
        const clone = response.clone();
        const text = await clone.text();
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      } catch {
        responseBody = response.body;
      }

      if (txId) {
        apiLogger.logResponse(txId, response.status, responseBody);
      }
      return response;
    });
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
          urlParams.get('accessToken') ||
          urlParams.get('jwtToken') ||
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
          if (
            key &&
            (key.startsWith('oidc.user:') ||
              key.includes('authentik_token') ||
              key.includes('tb_token') ||
              key === 'humid1_active_jwt' ||
              key === 'humid1_tb_jwt_token')
          ) {
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

    this.initOpenApiClient();
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

  /**
   * Login using OpenAPI client login method
   */
  public async loginWithCredentials(username: string, pass: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiLogin({
        body: {
          username,
          password: pass,
        },
      });

      if (res.data && res.data.token) {
        await this.setAuthSession(res.data.token);
        return { success: true };
      }

      const errObj = res.error as any;
      return {
        success: false,
        error: errObj?.message || 'Authentication failed. Please verify credentials.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to connect to ThingsBoard server.',
      };
    }
  }

  public async logout(): Promise<void> {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    await this.setAuthSession(null);
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

  public getClaimLogs(): ClaimLogEntry[] {
    return [...this.claimLogs];
  }

  public clearClaimLogs() {
    this.claimLogs = [];
    try {
      localStorage.removeItem(CLAIM_LOGS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private addClaimLog(entry: ClaimLogEntry) {
    this.claimLogs = [entry, ...this.claimLogs.slice(0, 49)];
    try {
      localStorage.setItem(CLAIM_LOGS_STORAGE_KEY, JSON.stringify(this.claimLogs));
    } catch {
      // ignore
    }
  }

  private loadClaimLogs() {
    try {
      const saved = localStorage.getItem(CLAIM_LOGS_STORAGE_KEY);
      if (saved) {
        this.claimLogs = JSON.parse(saved);
      }
    } catch {
      this.claimLogs = [];
    }
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

    this.initOpenApiClient();
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
    if (this.config.thingsboardToken && this.config.thingsboardToken.trim()) {
      return this.config.thingsboardToken.trim();
    }
    if (this.authToken && this.authToken.trim()) {
      return this.authToken.trim();
    }
    const autoToken = this.findAutomaticJwt();
    if (autoToken) {
      this.authToken = autoToken;
      return autoToken;
    }
    return null;
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

  /**
   * Fetch user profile from ThingsBoard via /src_lib/client getUser()
   */
  public async fetchUserProfile(): Promise<UserProfile | null> {
    const token = this.getEffectiveToken();
    if (!token) return this.currentUser;

    try {
      const res = await apiGetUser();
      if (res.data) {
        const user = res.data as any;
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

  /**
   * Fetch devices from ThingsBoard using OpenAPI client methods
   */
  public async fetchRealDevices(): Promise<HumidorDevice[]> {
    const effectiveToken = this.getEffectiveToken();
    if (!effectiveToken) {
      this.devices = [];
      this.notifySubscribers();
      return [];
    }

    try {
      let rawDevices: any[] = [];
      const customerId =
        typeof this.currentUser?.customerId === 'object'
          ? this.currentUser?.customerId?.id
          : this.currentUser?.customerId;

      // 1. Try customer devices if customerId exists
      if (customerId && customerId !== 'undefined') {
        try {
          const custRes = await apiGetCustomerDeviceInfos({
            path: { customerId },
            query: { pageSize: 100, page: 0 },
          });
          if (custRes.data && Array.isArray((custRes.data as any).data)) {
            rawDevices = (custRes.data as any).data;
          }
        } catch {
          // ignore
        }

        if (rawDevices.length === 0) {
          try {
            const custDevRes = await apiGetCustomerDevices({
              path: { customerId },
              query: { pageSize: 100, page: 0 },
            });
            if (custDevRes.data && Array.isArray((custDevRes.data as any).data)) {
              rawDevices = (custDevRes.data as any).data;
            }
          } catch {
            // ignore
          }
        }
      }

      // 2. Try tenant device infos
      if (rawDevices.length === 0) {
        try {
          const tenantRes = await apiGetTenantDeviceInfos({
            query: { pageSize: 100, page: 0 },
          });
          if (tenantRes.data && Array.isArray((tenantRes.data as any).data)) {
            rawDevices = (tenantRes.data as any).data;
          }
        } catch {
          // ignore
        }
      }

      // 3. Try tenant devices
      if (rawDevices.length === 0) {
        try {
          const tenantDevRes = await apiGetTenantDevices({
            query: { pageSize: 100, page: 0 },
          });
          if (tenantDevRes.data && Array.isArray((tenantDevRes.data as any).data)) {
            rawDevices = (tenantDevRes.data as any).data;
          }
        } catch {
          // ignore
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
            rh: 68,
            temp: 70,
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

          // Fetch real latest timeseries via /src_lib/client apiGetLatestTimeseries
          try {
            const telRes = await apiGetLatestTimeseries({
              path: {
                entityType: 'DEVICE',
                entityId: devId,
              },
            });

            if (telRes.data) {
              const telData = telRes.data as Record<string, Array<{ ts: number; value: any }>>;
              let rhVal = 0;
              let tempVal = 0;

              if (telData.rh?.[0]) rhVal = parseFloat(telData.rh[0].value);
              else if (telData.humidity?.[0]) rhVal = parseFloat(telData.humidity[0].value);

              if (telData.temp?.[0]) tempVal = parseFloat(telData.temp[0].value);
              else if (telData.temperature?.[0]) tempVal = parseFloat(telData.temperature[0].value);

              if (rhVal) telemetry.rh = rhVal;
              if (tempVal) telemetry.temp = tempVal;

              if (telData.battery?.[0]) telemetry.battery = parseFloat(telData.battery[0].value);
              if (telData.rssi?.[0]) telemetry.rssi = parseFloat(telData.rssi[0].value);

              const ts = telData.rh?.[0]?.ts || telData.temp?.[0]?.ts || telData.humidity?.[0]?.ts;
              if (ts) telemetry.timestamp = ts;
            }
          } catch {
            // ignore
          }

          // Fetch client attributes via /src_lib/client apiGetAttributesByScope
          try {
            const attrRes = await apiGetAttributesByScope({
              path: {
                entityType: 'DEVICE',
                entityId: devId,
                scope: 'CLIENT_SCOPE',
              },
            });

            if (attrRes.data && Array.isArray(attrRes.data)) {
              (attrRes.data as any[]).forEach((a: any) => {
                if (a.key in clientAttr) (clientAttr as any)[a.key] = a.value;
              });
            }
          } catch {
            // ignore
          }

          // Fetch shared attributes via /src_lib/client apiGetAttributesByScope
          try {
            const sharedRes = await apiGetAttributesByScope({
              path: {
                entityType: 'DEVICE',
                entityId: devId,
                scope: 'SHARED_SCOPE',
              },
            });

            if (sharedRes.data && Array.isArray(sharedRes.data)) {
              (sharedRes.data as any[]).forEach((a: any) => {
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

  /**
   * Fetch alarms via /src_lib/client apiGetAllAlarmsV2
   */
  public async fetchRealAlarms(): Promise<HumidorAlarm[]> {
    const token = this.getEffectiveToken();
    if (!token) {
      this.alarms = [];
      this.notifySubscribers();
      return [];
    }

    try {
      const res = await apiGetAllAlarmsV2({
        query: {
          pageSize: 50,
          page: 0,
          sortProperty: 'createdTime',
          sortOrder: 'DESC',
        },
      });

      if (res.data) {
        const rawAlarms = (res.data as any).data || [];
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

  /**
   * Claim device using the TypeScript OpenAPI library in /src_lib/client/ (apiClaimDevice)
   */
  public async claimDevice(deviceName: string, secretKey: string): Promise<HumidorDevice> {
    const token = this.getEffectiveToken();
    const serverUrl = this.config.serverUrl || DEFAULT_THINGSBOARD_URL;
    if (!token) {
      throw new Error(
        'Not connected to ThingsBoard. Please verify your session token or API Access Token in Server Settings.'
      );
    }

    const cleanDeviceName = deviceName.trim();
    const cleanSecret = secretKey ? secretKey.trim() : '';

    const logEntry: ClaimLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      deviceName: cleanDeviceName,
      secretKey: cleanSecret ? '••••••' : '(None)',
      status: 'PENDING',
      message: `Dispatching claim request for "${cleanDeviceName}" via /src_lib/client...`,
    };

    try {
      const claimRes = await apiClaimDevice({
        path: {
          deviceName: cleanDeviceName,
        },
        body: cleanSecret ? { secretKey: cleanSecret } : undefined,
      });

      if (claimRes.error) {
        const errObj = claimRes.error as any;
        const httpStatus = claimRes.response?.status || errObj?.status || 400;

        let userFriendlyMsg =
          errObj?.message ||
          errObj?.error ||
          `ThingsBoard claim request failed with status ${httpStatus}.`;

        if (httpStatus === 401) {
          userFriendlyMsg =
            'ThingsBoard Authentication Failed (401): The server rejected the session token. Please verify your ThingsBoard API Access Token in Server Settings.';
        } else if (httpStatus === 403) {
          userFriendlyMsg =
            'ThingsBoard Permission Denied (403): Only Customer accounts can claim devices, or this device is already claimed by another user.';
        } else if (httpStatus === 404) {
          userFriendlyMsg = `Device "${cleanDeviceName}" was not found on ThingsBoard. Ensure the hardware/emulator is active and provisioned.`;
        }

        logEntry.status = 'ERROR';
        logEntry.httpStatus = httpStatus;
        logEntry.message = userFriendlyMsg;
        logEntry.responsePayload = claimRes.error;
        this.addClaimLog(logEntry);

        throw new Error(userFriendlyMsg);
      }

      // Check if response string or object indicates a failure
      const respData = claimRes.data as any;
      if (
        (typeof respData === 'string' && respData.toUpperCase().includes('FAIL')) ||
        (respData && respData.response === 'FAILURE')
      ) {
        const failureMsg = `Claiming rejected: ThingsBoard rejected the claim secret for "${cleanDeviceName}". Verify the secret PIN and try again.`;
        logEntry.status = 'ERROR';
        logEntry.httpStatus = 400;
        logEntry.message = failureMsg;
        logEntry.responsePayload = respData;
        this.addClaimLog(logEntry);
        throw new Error(failureMsg);
      }

      logEntry.status = 'SUCCESS';
      logEntry.httpStatus = 200;
      logEntry.message = `Device "${cleanDeviceName}" claimed successfully on ThingsBoard!`;
      logEntry.responsePayload = respData;
      this.addClaimLog(logEntry);

      // Refresh device registry from ThingsBoard
      const updatedDevices = await this.fetchRealDevices();
      const matched = updatedDevices.find(
        (d) =>
          d.name.toLowerCase() === cleanDeviceName.toLowerCase() ||
          d.clientAttributes.device_name?.toLowerCase() === cleanDeviceName.toLowerCase()
      );

      if (matched) return matched;
      if (updatedDevices.length > 0) return updatedDevices[0];

      // Provisional fallback device until first telemetry ingest
      const newDev: HumidorDevice = {
        id: 'claimed-' + cleanDeviceName,
        name: cleanDeviceName,
        status: 'ONLINE',
        lastActivityTime: Date.now(),
        lastSeen: Date.now(),
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
    } catch (err: any) {
      if (logEntry.status === 'PENDING') {
        logEntry.status = 'ERROR';
        logEntry.message = err?.message || 'Network error claiming device.';
        this.addClaimLog(logEntry);
      }
      throw err;
    }
  }

  /**
   * Reclaim device via /src_lib/client apiReClaimDevice
   */
  public async unclaimDevice(deviceName: string): Promise<boolean> {
    const token = this.getEffectiveToken();
    if (!token) {
      throw new Error('Not connected to ThingsBoard.');
    }

    const cleanDeviceName = deviceName.trim();
    const res = await apiReClaimDevice({
      path: {
        deviceName: cleanDeviceName,
      },
    });

    if (res.error) {
      const errObj = res.error as any;
      throw new Error(errObj?.message || `Failed to unclaim device "${cleanDeviceName}"`);
    }

    this.devices = this.devices.filter(
      (d) =>
        d.name.toLowerCase() !== cleanDeviceName.toLowerCase() &&
        d.clientAttributes.device_name?.toLowerCase() !== cleanDeviceName.toLowerCase()
    );
    this.notifySubscribers();
    return true;
  }

  /**
   * Get timeseries history via /src_lib/client apiGetTimeseriesHistory
   */
  public async getHistory(deviceId: string, rangeHours: number = 72): Promise<HistoricalTelemetryPoint[]> {
    const token = this.getEffectiveToken();
    if (!token) return [];

    try {
      const startTs = Date.now() - rangeHours * 3600 * 1000;
      const endTs = Date.now();
      const limit = '500';

      const res = await apiGetTimeseriesHistory({
        path: {
          entityType: 'DEVICE',
          entityId: deviceId,
        },
        query: {
          keys: 'rh,temp,battery,humidity,temperature',
          startTs,
          endTs,
          limit,
        },
      });

      if (res.data) {
        const data = res.data as any;
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

  /**
   * Update shared attributes via /src_lib/client apiSaveDeviceAttributes
   */
  public async updateSharedAttributes(deviceId: string, attributes: Partial<SharedAttributes>): Promise<void> {
    const token = this.getEffectiveToken();
    if (token) {
      try {
        await apiSaveDeviceAttributes({
          path: {
            deviceId,
            scope: 'SHARED_SCOPE',
          },
          body: JSON.stringify(attributes) as any,
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

  /**
   * Acknowledge alarm via /src_lib/client apiAckAlarm
   */
  public acknowledgeAlarm(alarmId: string) {
    const token = this.getEffectiveToken();
    if (token) {
      apiAckAlarm({ path: { alarmId } }).catch(() => {});
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

  /**
   * Clear alarm via /src_lib/client apiClearAlarm
   */
  public clearAlarm(alarmId: string) {
    const token = this.getEffectiveToken();
    if (token) {
      apiClearAlarm({ path: { alarmId } }).catch(() => {});
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
