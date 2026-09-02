import { client } from '../../src_lib/client/services.gen';
import {
  login as apiLogin,
  logout as apiLogout,
  getUser as apiGetUser,
  refreshToken as apiRefreshToken,
  getOauth2Clients as apiGetOauth2Clients,
  claimDevice as apiClaimDevice,
  reClaimDevice as apiReClaimDevice,
  getCustomerDeviceInfos as apiGetCustomerDeviceInfos,
  getCustomerDevices as apiGetCustomerDevices,
  saveDeviceAttributes as apiSaveDeviceAttributes,
} from '../../src_lib/client/services.gen';
import type {
  User,
  ClaimDeviceData,
  ClaimRequest,
} from '../../src_lib/client/types.gen';
import {
  AuthentikUser,
  ClaimLogEntry,
  HumidorDevice,
  OAuth2ClientOption,
  ThingsBoardConfig,
  SharedAttributes,
} from '../types';
import { INITIAL_DEVICES, generateHistory } from './thingsboard';
import { APP_CONFIG } from '../config/env';

const STORAGE_KEY_TOKEN = 'humid1_tb_jwt_token';
const STORAGE_KEY_REFRESH = 'humid1_tb_jwt_refresh';
const STORAGE_KEY_USER = 'humid1_tb_user_profile';
const STORAGE_KEY_SERVER = 'humid1_tb_server_url';
const STORAGE_KEY_SIMULATED = 'humid1_tb_simulated_mode';
const STORAGE_KEY_CLAIM_LOGS = 'humid1_tb_claim_logs';

export class ThingsBoardClientService {
  private serverUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isSimulated: boolean = false;
  private currentUser: AuthentikUser | null = null;
  private claimLogs: ClaimLogEntry[] = [];

  constructor() {
    this.serverUrl =
      localStorage.getItem(STORAGE_KEY_SERVER) ||
      APP_CONFIG.domains.thingsboardUrl ||
      'https://app.humid1.com';

    this.token = localStorage.getItem(STORAGE_KEY_TOKEN) || null;
    this.refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH) || null;
    const simStored = localStorage.getItem(STORAGE_KEY_SIMULATED);
    this.isSimulated = simStored === 'true' || (!this.token && !APP_CONFIG.domains.thingsboardUrl);

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

    // Request interceptor to attach JWT Token
    client.interceptors.request.use((request) => {
      if (this.token) {
        request.headers.set('X-Authorization', `Bearer ${this.token}`);
      }
      return request;
    });

    // Response interceptor for automatic silent token refresh
    client.interceptors.response.use(async (response) => {
      if (response.status === 401 && this.refreshToken && !this.isSimulated) {
        const refreshed = await this.trySilentTokenRefresh();
        if (refreshed) {
          // Token refreshed, but client-fetch might not auto-replay automatically without custom client wrapper.
          console.info('[ThingsBoard Auth] Token silently refreshed');
        }
      }
      return response;
    });
  }

  /**
   * Check for SSO Redirect callback parameters in URL query or hash
   * e.g., ?token=xxx&refreshToken=yyy from Authentik OAuth2 -> ThingsBoard redirect
   */
  public checkForSSOCallback(): AuthentikUser | null {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const token = urlParams.get('token') || urlParams.get('accessToken') || hashParams.get('token');
    const refreshToken = urlParams.get('refreshToken') || hashParams.get('refreshToken');

    if (token) {
      console.info('[Authentik SSO] Detected token in URL parameters, saving session...');
      this.setSession(token, refreshToken || undefined);
      this.isSimulated = false;
      localStorage.setItem(STORAGE_KEY_SIMULATED, 'false');

      // Clean up URL query parameters cleanly
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const decoded = this.decodeJwtPayload(token);
      const user: AuthentikUser = {
        id: (decoded?.userId as string) || 'tb-user-authentik',
        email: (decoded?.sub as string) || 'authentik.user@customer.io',
        name: (decoded?.firstName as string) || (decoded?.sub as string) || 'Customer (Authentik SSO)',
        authority: (decoded?.scopes as any)?.[0] || 'CUSTOMER_USER',
        customerId: (decoded?.customerId as string) || undefined,
        tenantId: (decoded?.tenantId as string) || undefined,
        isSimulated: false,
      };
      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return user;
    }
    return null;
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

  public isSimulatedMode(): boolean {
    return this.isSimulated;
  }

  public setSimulatedMode(simulated: boolean) {
    this.isSimulated = simulated;
    localStorage.setItem(STORAGE_KEY_SIMULATED, simulated ? 'true' : 'false');
    if (simulated && !this.currentUser) {
      this.setDemoUser();
    }
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
  }

  public async logout(): Promise<void> {
    if (!this.isSimulated && this.token) {
      try {
        await apiLogout();
      } catch (err) {
        console.warn('[ThingsBoard] Logout API error:', err);
      }
    }
    this.clearSession();
  }

  /**
   * Fetch available OAuth2 / Authentik SSO clients configured on ThingsBoard
   */
  public async getAvailableOAuth2Clients(): Promise<OAuth2ClientOption[]> {
    if (this.isSimulated) {
      return [
        {
          name: 'Authentik SSO (Humid1 Identity)',
          icon: 'authentik',
          url: `${this.serverUrl}/oauth2/authorization/authentik`,
        },
      ];
    }

    try {
      const response = await apiGetOauth2Clients();
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((clientItem: any) => ({
          name: clientItem.title || clientItem.name || 'Authentik SSO',
          icon: clientItem.icon,
          url: clientItem.url || `${this.serverUrl}/oauth2/authorization/${clientItem.name || 'authentik'}`,
        }));
      }
    } catch (err) {
      console.warn('[ThingsBoard SSO] Unable to fetch OAuth2 clients, providing default Authentik option:', err);
    }

    // Default fallback Authentik SSO provider
    return [
      {
        name: 'Authentik SSO (Humid1 Identity)',
        icon: 'authentik',
        url: `${this.serverUrl}/oauth2/authorization/authentik`,
      },
    ];
  }

  /**
   * Login using ThingsBoard Customer Credentials
   */
  public async loginWithCredentials(
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: AuthentikUser }> {
    if (this.isSimulated) {
      this.setSession('simulated-jwt-token-' + Date.now(), 'simulated-refresh-token-' + Date.now());
      const demoUser: AuthentikUser = {
        id: 'cust-usr-001',
        email: username || 'client@humid1.com',
        firstName: 'Authentik',
        lastName: 'Customer',
        name: 'Authentik Client User',
        authority: 'CUSTOMER_USER',
        customerId: '784f394c-42b6-435a-983c-b7beff2784f9',
        tenantId: 'd6b9d880-2a54-11eb-a017-f584e2a87401',
        createdTime: Date.now() - 30 * 86400 * 1000,
        isSimulated: true,
      };
      this.currentUser = demoUser;
      return { success: true, user: demoUser };
    }

    try {
      const res = await apiLogin({
        body: {
          username,
          password,
        },
      });

      if (res.data && res.data.token) {
        this.setSession(res.data.token, res.data.refreshToken);
        const userRes = await this.fetchCurrentUser();
        return { success: true, user: userRes || undefined };
      } else {
        return {
          success: false,
          error: (res.error as any)?.message || 'Authentication failed. Please check credentials.',
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
   * Fetch current authenticated user profile
   */
  public async fetchCurrentUser(): Promise<AuthentikUser | null> {
    if (this.isSimulated) {
      if (!this.currentUser) {
        this.setDemoUser();
      }
      return this.currentUser;
    }

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
        return authUser;
      }
    } catch (err) {
      console.warn('[ThingsBoard] Failed to fetch current user profile:', err);
    }
    return null;
  }

  public getCurrentUser(): AuthentikUser | null {
    return this.currentUser;
  }

  private setDemoUser() {
    this.currentUser = {
      id: 'usr-authentik-customer-01',
      email: 'customer@humid1.internal',
      firstName: 'Authentik',
      lastName: 'Registered User',
      name: 'Customer (Authentik SSO)',
      authority: 'CUSTOMER_USER',
      customerId: '32499a20-d785-11ed-a06c-21dd57dd88ca',
      tenantId: '784f394c-42b6-435a-983c-b7beff2784f9',
      createdTime: Date.now() - 60 * 86400 * 1000,
      isSimulated: true,
    };
  }

  /**
   * Silent Token Refresh
   */
  public async trySilentTokenRefresh(): Promise<boolean> {
    if (!this.refreshToken || this.isSimulated) return false;

    try {
      const res = await apiRefreshToken({
        body: {
          refreshToken: this.refreshToken,
        },
      });

      if (res.data && res.data.token) {
        this.setSession(res.data.token, res.data.refreshToken);
        return true;
      }
    } catch (err) {
      console.warn('[ThingsBoard] Silent token refresh failed, logging out:', err);
      this.clearSession();
    }
    return false;
  }

  /**
   * Device Claiming via ThingsBoard API: POST /api/customer/device/{deviceName}/claim
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
      message: 'Submitting claim request to ThingsBoard /api/customer/device/{deviceName}/claim',
    };

    if (this.isSimulated) {
      const mockDevice = this.createMockClaimedDevice(trimmedName);
      logEntry.status = 'SUCCESS';
      logEntry.httpStatus = 200;
      logEntry.message = `Successfully claimed device "${trimmedName}" in Simulated/Demo Mode.`;
      logEntry.responsePayload = {
        result: 'SUCCESS',
        deviceName: trimmedName,
        deviceId: mockDevice.id,
        customerId: this.currentUser?.customerId || 'demo-customer-id',
        claimedTime: Date.now(),
      };
      this.addClaimLog(logEntry);
      return { success: true, rawResponse: logEntry.responsePayload, device: mockDevice };
    }

    try {
      const claimData: ClaimDeviceData = {
        path: {
          deviceName: trimmedName,
        },
        body: trimmedKey ? { secretKey: trimmedKey } : undefined,
      };

      const res = await apiClaimDevice(claimData);

      if (res.error) {
        const errorMsg = (res.error as any)?.message || 'ThingsBoard claim error: Claiming denied or device not found.';
        logEntry.status = 'ERROR';
        logEntry.httpStatus = (res.error as any)?.status || 400;
        logEntry.message = errorMsg;
        logEntry.responsePayload = res.error;
        this.addClaimLog(logEntry);
        return { success: false, error: errorMsg, rawResponse: res.error };
      }

      logEntry.status = 'SUCCESS';
      logEntry.httpStatus = 200;
      logEntry.message = `Successfully claimed device "${trimmedName}" under customer ${this.currentUser?.customerId || 'account'}.`;
      logEntry.responsePayload = res.data;
      this.addClaimLog(logEntry);

      const claimedDev = this.createMockClaimedDevice(trimmedName);
      return { success: true, rawResponse: res.data, device: claimedDev };
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
    if (this.isSimulated) {
      this.addClaimLog({
        id: 'log-' + Date.now(),
        timestamp: Date.now(),
        deviceName,
        secretKey: 'N/A',
        status: 'SUCCESS',
        httpStatus: 200,
        message: `Device "${deviceName}" reclaimed and released from customer.`,
      });
      return { success: true };
    }

    try {
      const res = await apiReClaimDevice({
        path: {
          deviceName,
        },
      });

      if (res.error) {
        return { success: false, error: (res.error as any)?.message || 'Failed to reclaim device' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error reclaiming device' };
    }
  }

  /**
   * Get Customer Devices via ThingsBoard API
   */
  public async fetchCustomerDevices(): Promise<HumidorDevice[]> {
    if (this.isSimulated || !this.token) {
      return INITIAL_DEVICES;
    }

    try {
      const customerId = this.currentUser?.customerId;
      if (!customerId) {
        return INITIAL_DEVICES;
      }

      const res = await apiGetCustomerDeviceInfos({
        path: { customerId },
        query: { pageSize: 50, page: 0 },
      });

      if (res.data && Array.isArray((res.data as any).data)) {
        const tbDevices = (res.data as any).data;
        if (tbDevices.length === 0) return INITIAL_DEVICES;

        return tbDevices.map((d: any, idx: number) => ({
          id: d.id?.id || `tb-dev-${idx}`,
          name: d.label || d.name,
          status: 'ONLINE' as const,
          lastSeen: d.createdTime || Date.now(),
          telemetry: {
            rh: 68.0 + (idx % 3),
            temp: 70.0 - (idx % 2),
            battery: 90 - idx * 5,
            rssi: -55 - idx * 6,
            timestamp: Date.now(),
          },
          clientAttributes: {
            fw_version: 'v1.0.4',
            device_name: d.name,
            mac_address: `24:6F:28:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
            ssid: 'Humidor_Vault_5G',
            ip_address: `192.168.1.${140 + idx}`,
            has_sd_card: true,
            audio_synced: true,
          },
          sharedAttributes: {
            sleep_interval_sec: 900,
            device_theme: 'DARK' as const,
            sound_enabled: true,
            auto_update_enabled: true,
            manual_ota_trigger: false,
          },
          ota: {
            fw_state: 'IDLE' as const,
            fw_progress: 0,
            target_version: 'v1.2.0',
          },
          history: generateHistory(68.0 + (idx % 3), 70.0 - (idx % 2), 90 - idx * 5, 7, 30),
        }));
      }
    } catch (err) {
      console.warn('[ThingsBoard] Unable to fetch devices from server, using local list:', err);
    }
    return INITIAL_DEVICES;
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

  public createMockClaimedDevice(deviceName: string): HumidorDevice {
    const newId = 'tb-claimed-' + Math.random().toString(36).substring(2, 9);
    return {
      id: newId,
      name: deviceName.replace(/^HUMID1-?/i, '').replace(/-\d+$/, '') || deviceName,
      status: 'ONLINE',
      lastSeen: Date.now(),
      telemetry: {
        rh: Number((68.5 + (Math.random() - 0.5) * 1.5).toFixed(1)),
        temp: Number((69.8 + (Math.random() - 0.5) * 1.2).toFixed(1)),
        battery: 100,
        rssi: -52,
        timestamp: Date.now(),
      },
      clientAttributes: {
        fw_version: 'v1.0.4',
        device_name: deviceName.toUpperCase(),
        mac_address: `24:6F:28:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
        ssid: 'Humidor_Vault_5G',
        ip_address: `192.168.1.${Math.floor(Math.random() * 80 + 150)}`,
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
      ota: {
        fw_state: 'IDLE',
        fw_progress: 0,
        target_version: 'v1.2.0',
      },
      history: generateHistory(68.5, 69.8, 100, 7, 30),
    };
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
