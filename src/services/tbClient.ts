import {
  client,
  login as tbLogin,
  logout as tbLogout,
  getUser as apiGetUser,
  getOAuth2Clients as apiGetOauth2Clients,
  claimDevice1 as apiClaimDevice,
  reClaimDevice as apiReClaimDevice,
  getCustomerDeviceInfos as apiGetCustomerDeviceInfos,
  getAllDeviceInfos as apiGetAllDeviceInfos,
  getLatestTimeseries as apiGetLatestTimeseries,
  getAttributesByScope as apiGetAttributesByScope,
  saveDeviceAttributes as apiSaveDeviceAttributes,
  getAllAlarmsV2 as apiGetAllAlarmsV2,
  ackAlarm as apiAckAlarm,
  clearAlarm as apiClearAlarm,
  type User,
  type ClaimDeviceData,
} from '@enerlab/thingsboard-client';
import {
  AuthentikUser,
  ClaimLogEntry,
  HumidorDevice,
  OAuth2ClientOption,
  HumidorAlarm,
  SharedAttributes,
  TimeSeriesPoint,
} from '../types';
import {
  APP_CONFIG,
  getAuthentikSlug,
  getAuthentikAppLoginUrl,
  getAuthentikOidcAuthorizeUrl,
  getThingsBoardOAuth2Url,
  getCurrentReturnUrl,
} from '../config/env';
import { notificationService } from './notificationService';
import { apiLogger } from './apiLogger';

const STORAGE_KEY_TOKEN = 'humid1_tb_jwt_token';
const STORAGE_KEY_REFRESH = 'humid1_tb_jwt_refresh';
const STORAGE_KEY_USER = 'humid1_tb_user_profile';
const STORAGE_KEY_SERVER = 'humid1_tb_server_url';
const STORAGE_KEY_CLAIM_LOGS = 'humid1_tb_claim_logs';

export class ThingsBoardClientService {
  private serverUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: AuthentikUser | null = null;
  private claimLogs: ClaimLogEntry[] = [];

  constructor() {
    this.serverUrl =
      localStorage.getItem(STORAGE_KEY_SERVER) ||
      APP_CONFIG.domains.thingsboardUrl ||
      'https://app.humid1.com';

    this.token = localStorage.getItem(STORAGE_KEY_TOKEN) || null;
    this.refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH) || null;

    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch {
      this.currentUser = null;
    }

    try {
      const logs = localStorage.getItem(STORAGE_KEY_CLAIM_LOGS);
      if (logs) {
        this.claimLogs = JSON.parse(logs);
      }
    } catch {
      this.claimLogs = [];
    }

    this.initClientConfig();
    this.checkForSSOCallback();
  }

  private initClientConfig() {
    client.setConfig({
      baseUrl: this.serverUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Request interceptor to attach JWT Token & log transaction
    client.interceptors.request.use((request, options) => {
      if (this.token) {
        request.headers.set('X-Authorization', `Bearer ${this.token}`);
        request.headers.set('Authorization', `Bearer ${this.token}`);
      }
      const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
      (request as any).__txId = txId;

      let parsedBody: any = options?.body;
      if (!parsedBody && request.body) {
        try {
          parsedBody = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        } catch {
          parsedBody = request.body;
        }
      }

      apiLogger.logRequest(txId, request.method || 'GET', request.url || '', parsedBody);
      return request;
    });

    // Response interceptor for automatic silent token refresh & log response
    client.interceptors.response.use(async (response, request) => {
      const txId = (request as any)?.__txId;
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

      if (response.status === 401 && this.refreshToken) {
        await this.trySilentTokenRefresh();
      }
      return response;
    });
  }

  /**
   * Check for SSO Redirect callback parameters in URL query or hash
   * Supports Authentik SSO (web-dash) and ThingsBoard OAuth2 tokens
   */
  public checkForSSOCallback(): AuthentikUser | null {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const token =
      urlParams.get('token') ||
      urlParams.get('accessToken') ||
      urlParams.get('jwtToken') ||
      urlParams.get('access_token') ||
      urlParams.get('id_token') ||
      urlParams.get('auth_token') ||
      urlParams.get('bearer_token') ||
      hashParams.get('token') ||
      hashParams.get('accessToken') ||
      hashParams.get('access_token') ||
      hashParams.get('id_token');

    const refreshToken =
      urlParams.get('refreshToken') ||
      urlParams.get('refresh_token') ||
      hashParams.get('refreshToken') ||
      hashParams.get('refresh_token');

    if (token) {
      console.info('[Authentik SSO] Detected token in URL parameters, establishing session...');
      this.setSession(token, refreshToken || undefined);

      // Clean up URL query and hash parameters cleanly while preserving path
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const decoded = this.decodeJwtPayload(token);
      const email =
        (decoded?.email as string) ||
        (decoded?.preferred_username as string) ||
        (decoded?.sub as string) ||
        'customer@humid1.com';

      const firstName = (decoded?.given_name as string) || (decoded?.firstName as string) || undefined;
      const lastName = (decoded?.family_name as string) || (decoded?.lastName as string) || undefined;
      const name =
        (decoded?.name as string) ||
        [firstName, lastName].filter(Boolean).join(' ') ||
        (decoded?.preferred_username as string) ||
        email;

      const user: AuthentikUser = {
        id: (decoded?.userId as string) || (decoded?.sub as string) || 'tb-user-authentik',
        email,
        firstName,
        lastName,
        name,
        authority: (decoded?.scopes as any)?.[0] || (decoded?.role as string) || 'CUSTOMER_USER',
        customerId: (decoded?.customerId as string) || undefined,
        tenantId: (decoded?.tenantId as string) || undefined,
        isSimulated: false,
      };

      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

      // Asynchronously fetch complete user profile from server if valid ThingsBoard JWT
      this.fetchCurrentUser().catch(() => {});
      return user;
    }

    return this.currentUser;
  }

  public setServerUrl(url: string) {
    this.serverUrl = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY_SERVER, this.serverUrl);
    this.initClientConfig();
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public setSession(token: string, refreshToken?: string) {
    this.token = token;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
    }
    this.initClientConfig();
  }

  public clearSession() {
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_USER);
  }

  public async logout(): Promise<void> {
    if (this.token) {
      try {
        tbLogout({ client: client as any });
      } catch (err) {
        console.warn('[ThingsBoard] Logout API error:', err);
      }
    }
    this.clearSession();
  }

  /**
   * Fetch available OAuth2 / Authentik SSO clients
   * Prioritizes direct Authentik application flow (web-dash) that returns directly to this dashboard
   */
  public async getAvailableOAuth2Clients(): Promise<OAuth2ClientOption[]> {
    const slug = getAuthentikSlug();
    const returnUrl = getCurrentReturnUrl();

    const directAuthentikUrl = getAuthentikAppLoginUrl(slug, returnUrl);
    const thingsBoardOAuthUrl = getThingsBoardOAuth2Url(this.serverUrl, returnUrl);

    try {
      const response = await apiGetOauth2Clients();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const tbClients = response.data.map((clientItem: any) => {
          let resolvedUrl = clientItem.url;
          if (!resolvedUrl) {
            resolvedUrl = `${this.serverUrl}/oauth2/authorization/${clientItem.name || 'authentik'}?redirect_uri=${encodeURIComponent(returnUrl)}&prevURI=${encodeURIComponent(returnUrl)}`;
          } else if (resolvedUrl.startsWith('/')) {
            resolvedUrl = `${this.serverUrl}${resolvedUrl}?redirect_uri=${encodeURIComponent(returnUrl)}&prevURI=${encodeURIComponent(returnUrl)}`;
          }

          return {
            name: clientItem.title || clientItem.name || 'ThingsBoard OAuth2 Gateway',
            icon: clientItem.icon || 'authentik',
            url: resolvedUrl,
          };
        });

        return [
          {
            name: `Authentik SSO (${slug})`,
            icon: 'authentik',
            url: directAuthentikUrl,
          },
          ...tbClients,
        ];
      }
    } catch (err) {
      console.warn('[ThingsBoard SSO] Unable to fetch OAuth2 clients list from server:', err);
    }

    return [
      {
        name: `Authentik SSO (${slug})`,
        icon: 'authentik',
        url: directAuthentikUrl,
      },
      {
        name: 'ThingsBoard OAuth2 Gateway',
        icon: 'authentik',
        url: thingsBoardOAuthUrl,
      },
    ];
  }

  /**
   * Login using ThingsBoard Customer / Admin Credentials
   */
  public async loginWithCredentials(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: AuthentikUser }> {
    try {
      const res = await tbLogin(username, password, { client: client as any });

      if (res && res.token) {
        this.setSession(res.token, res.refreshToken);
        const userRes = await this.fetchCurrentUser();
        return { success: true, user: userRes || undefined };
      } else {
        return {
          success: false,
          error: 'Authentication failed. Please verify credentials.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to connect to ThingsBoard server.',
      };
    }
  }

  /**
   * Fetch current authenticated user profile from ThingsBoard /api/auth/user
   */
  public async fetchCurrentUser(): Promise<AuthentikUser | null> {
    if (!this.token) {
      return null;
    }

    try {
      const res = await apiGetUser();
      if (res.data) {
        const u = res.data as User;
        const authUser: AuthentikUser = {
          id: u.id?.id,
          email: u.email || '',
          firstName: u.firstName,
          lastName: u.lastName,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Customer User',
          authority: u.authority,
          customerId: u.customerId?.id,
          tenantId: u.tenantId?.id,
          createdTime: u.createdTime,
          isSimulated: false,
        };
        this.currentUser = authUser;
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
        return authUser;
      }
    } catch (err) {
      console.warn('[ThingsBoard] Failed to fetch current user profile:', err);
    }

    return this.currentUser;
  }

  public getCurrentUser(): AuthentikUser | null {
    return this.currentUser;
  }

  /**
   * Silent Token Refresh
   */
  public async trySilentTokenRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const res = await fetch(`${this.serverUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          this.setSession(data.token, data.refreshToken);
          return true;
        }
      }
    } catch (err) {
      console.warn('[ThingsBoard] Silent token refresh failed:', err);
    }
    return false;
  }

  /**
   * Device Claiming via Real ThingsBoard API: POST /api/customer/device/{deviceName}/claim
   */
  public async claimDevice(
    deviceName: string,
    secretKey: string
  ): Promise<{ success: boolean; error?: string; rawResponse?: unknown; device?: HumidorDevice }> {
    const trimmedName = deviceName.trim();
    const trimmedKey = secretKey.trim();

    if (!trimmedName) {
      return { success: false, error: 'Device name / identifier is required.' };
    }

    const logEntry: ClaimLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      deviceName: trimmedName,
      secretKey: trimmedKey ? '••••••' : '(None)',
      status: 'PENDING',
      message: `Dispatching claim request to ${this.serverUrl}/api/customer/device/${encodeURIComponent(trimmedName)}/claim`,
    };

    try {
      const claimData = {
        path: {
          deviceName: trimmedName,
        },
        body: trimmedKey ? { secretKey: trimmedKey } : undefined,
      };

      const res = await apiClaimDevice(claimData as any);

      if (res.error) {
        const errorObj = res.error as any;
        const errorMsg =
          errorObj?.message ||
          errorObj?.error ||
          'Claiming rejected: Device not found or claiming not permitted on this unit.';
        logEntry.status = 'ERROR';
        logEntry.httpStatus = errorObj?.status || 400;
        logEntry.message = errorMsg;
        logEntry.responsePayload = res.error;
        this.addClaimLog(logEntry);
        return { success: false, error: errorMsg, rawResponse: res.error };
      }

      logEntry.status = 'SUCCESS';
      logEntry.httpStatus = 200;
      logEntry.message = `Device "${trimmedName}" claimed successfully under customer ${this.currentUser?.customerId || 'account'}.`;
      logEntry.responsePayload = res.data;
      this.addClaimLog(logEntry);

      notificationService.notifyDeviceClaimed(trimmedName);

      // Fetch fresh device data from ThingsBoard
      const refreshedDevices = await this.fetchCustomerDevices();
      const claimedDev = refreshedDevices.find(
        (d) => d.clientAttributes.device_name?.toLowerCase() === trimmedName.toLowerCase() || d.name?.toLowerCase() === trimmedName.toLowerCase()
      );

      return {
        success: true,
        rawResponse: res.data,
        device: claimedDev || (refreshedDevices.length > 0 ? refreshedDevices[0] : undefined),
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error claiming device.';
      logEntry.status = 'ERROR';
      logEntry.httpStatus = 500;
      logEntry.message = errMsg;
      logEntry.responsePayload = { error: String(err) };
      this.addClaimLog(logEntry);
      return { success: false, error: errMsg, rawResponse: err };
    }
  }

  /**
   * Reclaim / Release Device: DELETE /api/customer/device/{deviceName}/claim
   */
  public async reclaimDevice(deviceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiReClaimDevice({
        path: {
          deviceName,
        },
      });

      if (res.error) {
        const errObj = res.error as any;
        return { success: false, error: errObj?.message || 'Failed to reclaim device' };
      }

      this.addClaimLog({
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        deviceName,
        secretKey: 'N/A',
        status: 'SUCCESS',
        httpStatus: 200,
        message: `Device "${deviceName}" unassigned and released back to open pool.`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error reclaiming device' };
    }
  }

  /**
   * Fetch Real Devices from ThingsBoard
   * Returns empty array if no hardware is assigned or claimed yet.
   */
  public async fetchCustomerDevices(): Promise<HumidorDevice[]> {
    if (!this.token) {
      return [];
    }

    try {
      let rawDeviceList: any[] = [];
      const customerId = this.currentUser?.customerId;

      // Try customer devices if customerId exists
      if (customerId && customerId !== 'undefined') {
        const custRes = await apiGetCustomerDeviceInfos({
          path: { customerId },
          query: { pageSize: 100, page: 0 },
        });
        if (custRes.data && Array.isArray((custRes.data as any).data)) {
          rawDeviceList = (custRes.data as any).data;
        }
      }

      // If tenant admin or no devices found under customerId, try all device infos
      if (rawDeviceList.length === 0) {
        try {
          const tenantRes = await apiGetAllDeviceInfos({
            query: { pageSize: 100, page: 0 },
          });
          if (tenantRes.data && Array.isArray((tenantRes.data as any).data)) {
            rawDeviceList = (tenantRes.data as any).data;
          }
        } catch {
          // May fail if user is purely a customer user without tenant admin scope
        }
      }

      if (rawDeviceList.length === 0) {
        return [];
      }

      // Enrich each device with real telemetry and attributes from ThingsBoard
      const enrichedDevices = await Promise.all(
        rawDeviceList.map(async (d: any) => {
          const deviceId = d.id?.id;
          const deviceName = d.name || 'HUMID1-DEVICE';
          const label = d.label || deviceName;

          // Fetch Latest Timeseries
          let telemetryRh = 68.0;
          let telemetryTemp = 70.0;
          let telemetryBattery = 100;
          let telemetryRssi = -60;
          let lastSeenTs = d.createdTime || Date.now();

          try {
            const tsRes = await apiGetLatestTimeseries({
              path: {
                entityType: 'DEVICE',
                entityId: deviceId,
              },
            } as any);

            if (tsRes.data) {
              const tsData = tsRes.data as Record<string, Array<{ ts: number; value: any }>>;
              if (tsData.rh?.[0]?.value !== undefined) {
                telemetryRh = parseFloat(tsData.rh[0].value);
                lastSeenTs = Math.max(lastSeenTs, tsData.rh[0].ts);
              } else if (tsData.humidity?.[0]?.value !== undefined) {
                telemetryRh = parseFloat(tsData.humidity[0].value);
                lastSeenTs = Math.max(lastSeenTs, tsData.humidity[0].ts);
              }

              if (tsData.temp?.[0]?.value !== undefined) {
                telemetryTemp = parseFloat(tsData.temp[0].value);
                lastSeenTs = Math.max(lastSeenTs, tsData.temp[0].ts);
              } else if (tsData.temperature?.[0]?.value !== undefined) {
                telemetryTemp = parseFloat(tsData.temperature[0].value);
                lastSeenTs = Math.max(lastSeenTs, tsData.temperature[0].ts);
              }

              if (tsData.battery?.[0]?.value !== undefined) {
                telemetryBattery = parseInt(tsData.battery[0].value, 10);
                lastSeenTs = Math.max(lastSeenTs, tsData.battery[0].ts);
              }

              if (tsData.rssi?.[0]?.value !== undefined) {
                telemetryRssi = parseInt(tsData.rssi[0].value, 10);
              }
            }
          } catch {
            // Devices without telemetry yet
          }

          // Fetch Client Attributes
          let fwVersion = 'v1.0.4';
          let macAddress = '24:6F:28:XX:XX:XX';
          let ssid = 'Wi-Fi Network';
          let ipAddress = '192.168.1.100';
          let hasSdCard = true;
          let audioSynced = true;

          try {
            const clientAttrRes = await apiGetAttributesByScope({
              path: {
                entityType: 'DEVICE',
                entityId: deviceId,
                scope: 'CLIENT_SCOPE',
              },
            } as any);

            if (clientAttrRes.data && Array.isArray(clientAttrRes.data)) {
              for (const attr of clientAttrRes.data as Array<{ key: string; value: any }>) {
                if (attr.key === 'fw_version') fwVersion = String(attr.value);
                if (attr.key === 'mac_address') macAddress = String(attr.value);
                if (attr.key === 'ssid') ssid = String(attr.value);
                if (attr.key === 'ip_address') ipAddress = String(attr.value);
                if (attr.key === 'has_sd_card') hasSdCard = Boolean(attr.value);
                if (attr.key === 'audio_synced') audioSynced = Boolean(attr.value);
              }
            }
          } catch {
            // Attributes fallback
          }

          // Fetch Shared Attributes
          let sleepInterval = 900;
          let deviceTheme: 'DARK' | 'LIGHT' | 'STEALTH' = 'DARK';
          let soundEnabled = true;
          let autoUpdateEnabled = true;
          let manualOtaTrigger = false;

          try {
            const sharedAttrRes = await apiGetAttributesByScope({
              path: {
                entityType: 'DEVICE',
                entityId: deviceId,
                scope: 'SHARED_SCOPE',
              },
            } as any);

            if (sharedAttrRes.data && Array.isArray(sharedAttrRes.data)) {
              for (const attr of sharedAttrRes.data as Array<{ key: string; value: any }>) {
                if (attr.key === 'sleep_interval_sec') sleepInterval = Number(attr.value);
                if (attr.key === 'device_theme') deviceTheme = attr.value;
                if (attr.key === 'sound_enabled') soundEnabled = Boolean(attr.value);
                if (attr.key === 'auto_update_enabled') autoUpdateEnabled = Boolean(attr.value);
                if (attr.key === 'manual_ota_trigger') manualOtaTrigger = Boolean(attr.value);
              }
            }
          } catch {
            // Shared attributes fallback
          }

          // Generate initial timeline point from current telemetry
          const now = Date.now();
          const isRecent = now - lastSeenTs < 15 * 60 * 1000;
          const status = isRecent ? 'ONLINE' : ('OFFLINE' as const);

          const initialPoint: TimeSeriesPoint = {
            timestamp: lastSeenTs,
            timeFormatted: new Date(lastSeenTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateFormatted: new Date(lastSeenTs).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            rh: telemetryRh,
            temp: telemetryTemp,
            tempC: Number((((telemetryTemp - 32) * 5) / 9).toFixed(1)),
            battery: telemetryBattery,
            rssi: telemetryRssi,
          };

          const device: HumidorDevice = {
            id: deviceId,
            name: label,
            status,
            lastSeen: lastSeenTs,
            telemetry: {
              rh: telemetryRh,
              temp: telemetryTemp,
              battery: telemetryBattery,
              rssi: telemetryRssi,
              timestamp: lastSeenTs,
            },
            clientAttributes: {
              fw_version: fwVersion,
              device_name: deviceName,
              mac_address: macAddress,
              ssid,
              ip_address: ipAddress,
              has_sd_card: hasSdCard,
              audio_synced: audioSynced,
            },
            sharedAttributes: {
              sleep_interval_sec: sleepInterval,
              device_theme: deviceTheme,
              sound_enabled: soundEnabled,
              auto_update_enabled: autoUpdateEnabled,
              manual_ota_trigger: manualOtaTrigger,
            },
            ota: {
              fw_state: 'IDLE',
              fw_progress: 0,
              target_version: 'v1.2.0',
            },
            history: [initialPoint],
          };

          return device;
        })
      );

      return enrichedDevices;
    } catch (err) {
      console.warn('[ThingsBoard] Unable to fetch devices from server:', err);
      return [];
    }
  }

  /**
   * Fetch Alarms from ThingsBoard
   */
  public async fetchAlarms(): Promise<HumidorAlarm[]> {
    if (!this.token) return [];

    try {
      const res = await apiGetAllAlarmsV2({
        query: {
          pageSize: 50,
          page: 0,
          sortProperty: 'createdTime',
          sortOrder: 'DESC',
        },
      });

      if (res.data && Array.isArray((res.data as any).data)) {
        const tbAlarms = (res.data as any).data;
        return tbAlarms.map((a: any) => {
          let severity: 'CRITICAL' | 'MAJOR' | 'WARNING' = 'WARNING';
          if (a.severity === 'CRITICAL') severity = 'CRITICAL';
          else if (a.severity === 'MAJOR') severity = 'MAJOR';

          return {
            id: a.id?.id || String(a.createdTime),
            deviceId: a.originator?.id || '',
            deviceName: a.originatorName || 'Humidor Unit',
            type: a.type || 'Telemetry Out of Bounds',
            severity,
            status: a.status || 'ACTIVE_UNACK',
            message: a.details?.message || `${a.type} triggered on ${a.originatorName || 'device'}`,
            createdTime: a.createdTime,
            ackTime: a.ackTs || undefined,
            clearTime: a.clearTs || undefined,
            details: a.details,
          };
        });
      }
    } catch (err) {
      console.warn('[ThingsBoard] Unable to fetch alarms from server:', err);
    }
    return [];
  }

  /**
   * Acknowledge Alarm on ThingsBoard
   */
  public async acknowledgeAlarm(alarmId: string): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await apiAckAlarm({
        path: { alarmId },
      });
      return !res.error;
    } catch {
      return false;
    }
  }

  /**
   * Clear Alarm on ThingsBoard
   */
  public async clearAlarm(alarmId: string): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await apiClearAlarm({
        path: { alarmId },
      });
      return !res.error;
    } catch {
      return false;
    }
  }

  /**
   * Update Shared Attributes on Device
   */
  public async saveSharedAttributes(deviceId: string, attributes: Partial<SharedAttributes>): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await apiSaveDeviceAttributes({
        path: {
          deviceId,
          scope: 'SHARED_SCOPE',
        },
        body: JSON.stringify(attributes) as any,
      });
      return !res.error;
    } catch (e) {
      console.warn('[ThingsBoard] Failed to update shared attributes via API', e);
      return false;
    }
  }

  public getClaimLogs(): ClaimLogEntry[] {
    return [...this.claimLogs];
  }

  public clearClaimLogs() {
    this.claimLogs = [];
    localStorage.removeItem(STORAGE_KEY_CLAIM_LOGS);
  }

  private addClaimLog(entry: ClaimLogEntry) {
    this.claimLogs = [entry, ...this.claimLogs.slice(0, 49)];
    try {
      localStorage.setItem(STORAGE_KEY_CLAIM_LOGS, JSON.stringify(this.claimLogs));
    } catch {
      // ignore
    }
  }

  /**
   * Decode JWT token payload for inspection
   */
  public decodeJwtPayload(tokenStr?: string): Record<string, unknown> | null {
    const target = tokenStr || this.token;
    if (!target) return null;
    try {
      const parts = target.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}

export const tbClient = new ThingsBoardClientService();
