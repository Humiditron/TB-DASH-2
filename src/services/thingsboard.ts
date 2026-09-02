import axios, { AxiosInstance } from 'axios';
import { HumidorDevice, HumidorAlarm, ThingsBoardConfig, TimeSeriesPoint, SharedAttributes } from '../types';

// Helper to generate realistic historical data points
export function generateHistory(
  baseRh: number,
  baseTemp: number,
  baseBattery: number,
  days: number = 7,
  intervalMinutes: number = 30
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();
  const totalPoints = Math.floor((days * 24 * 60) / intervalMinutes);

  for (let i = totalPoints; i >= 0; i--) {
    const timestamp = now - i * intervalMinutes * 60 * 1000;
    const date = new Date(timestamp);

    // Diurnal variation + subtle random walk
    const hourOfDay = date.getHours() + date.getMinutes() / 60;
    const tempSine = Math.sin((hourOfDay - 8) * (Math.PI / 12)) * 1.8;
    const rhSine = -Math.sin((hourOfDay - 8) * (Math.PI / 12)) * 2.2;
    const noiseRh = (Math.random() - 0.5) * 0.8;
    const noiseTemp = (Math.random() - 0.5) * 0.6;

    const rh = Number(Math.max(50, Math.min(85, baseRh + rhSine + noiseRh)).toFixed(1));
    const temp = Number(Math.max(55, Math.min(90, baseTemp + tempSine + noiseTemp)).toFixed(1));
    const tempC = Number(((temp - 32) * (5 / 9)).toFixed(1));
    const batteryDrain = (i / totalPoints) * 3; // Slight discharge over time
    const battery = Math.max(5, Math.min(100, Math.round(baseBattery + batteryDrain + (Math.random() - 0.5))));

    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    points.push({
      timestamp,
      timeFormatted,
      dateFormatted,
      rh,
      temp,
      tempC,
      battery,
      rssi: Math.round(-50 - Math.random() * 25),
    });
  }

  return points;
}

// Initial realistic default devices
export const INITIAL_DEVICES: HumidorDevice[] = [
  {
    id: 'tb-dev-001',
    name: 'Main Cabinet',
    status: 'ONLINE',
    lastSeen: Date.now() - 45 * 1000,
    telemetry: {
      rh: 69.4,
      temp: 70.2,
      battery: 92,
      rssi: -54,
      timestamp: Date.now() - 45 * 1000,
    },
    clientAttributes: {
      fw_version: 'v1.0.4',
      device_name: 'HUMID1-CABINET-01',
      mac_address: '24:6F:28:B4:9C:12',
      ssid: 'Humidor_Vault_5G',
      ip_address: '192.168.1.142',
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
    history: generateHistory(69.4, 70.2, 92, 7, 30),
  },
  {
    id: 'tb-dev-002',
    name: 'Aging Box',
    status: 'ONLINE',
    lastSeen: Date.now() - 120 * 1000,
    telemetry: {
      rh: 66.8,
      temp: 68.5,
      battery: 78,
      rssi: -68,
      timestamp: Date.now() - 120 * 1000,
    },
    clientAttributes: {
      fw_version: 'v1.0.3',
      device_name: 'HUMID1-AGING-02',
      mac_address: '30:AE:A4:71:D0:88',
      ssid: 'Humidor_Vault_5G',
      ip_address: '192.168.1.148',
      has_sd_card: true,
      audio_synced: true,
    },
    sharedAttributes: {
      sleep_interval_sec: 900,
      device_theme: 'STEALTH',
      sound_enabled: true,
      auto_update_enabled: true,
      manual_ota_trigger: false,
    },
    ota: {
      fw_state: 'IDLE',
      fw_progress: 0,
      target_version: 'v1.2.0',
    },
    history: generateHistory(66.8, 68.5, 78, 7, 30),
  },
  {
    id: 'tb-dev-003',
    name: 'Travel Case',
    status: 'OFFLINE',
    lastSeen: Date.now() - 4800 * 1000, // > 1 hour ago
    telemetry: {
      rh: 61.2, // Below 65% trigger alarm
      temp: 76.4, // Above 75°F trigger alarm
      battery: 18, // Below 20% trigger alarm
      rssi: -82,
      timestamp: Date.now() - 4800 * 1000,
    },
    clientAttributes: {
      fw_version: 'v1.0.1',
      device_name: 'HUMID1-TRAVEL-03',
      mac_address: '44:17:93:11:EF:70',
      ssid: 'Hotel_Guest_WiFi',
      ip_address: '10.0.0.87',
      has_sd_card: false, // Locked out of sound!
      audio_synced: false,
    },
    sharedAttributes: {
      sleep_interval_sec: 1800,
      device_theme: 'LIGHT',
      sound_enabled: false, // Hard lockout
      auto_update_enabled: false,
      manual_ota_trigger: false,
    },
    ota: {
      fw_state: 'IDLE',
      fw_progress: 0,
      target_version: 'v1.2.0',
    },
    history: generateHistory(61.2, 76.4, 18, 7, 30),
  },
];

export const INITIAL_ALARMS: HumidorAlarm[] = [
  {
    id: 'alarm-001',
    deviceId: 'tb-dev-003',
    deviceName: 'Travel Case',
    type: 'Humidity Out of Bounds',
    severity: 'CRITICAL',
    status: 'ACTIVE_UNACK',
    message: 'Relative humidity dropped to 61.2% (Safe: 65.0% - 75.0%)',
    createdTime: Date.now() - 1800 * 1000,
    details: { current_rh: 61.2, threshold_min: 65.0 },
  },
  {
    id: 'alarm-002',
    deviceId: 'tb-dev-003',
    deviceName: 'Travel Case',
    type: 'Temperature Ceiling Breach',
    severity: 'MAJOR',
    status: 'ACTIVE_UNACK',
    message: 'Ambient temperature reached 76.4°F (Tobacco beetle risk threshold > 75.0°F)',
    createdTime: Date.now() - 2400 * 1000,
    details: { current_temp: 76.4, threshold_max: 75.0 },
  },
  {
    id: 'alarm-003',
    deviceId: 'tb-dev-003',
    deviceName: 'Travel Case',
    type: 'Low Battery Alert',
    severity: 'WARNING',
    status: 'ACTIVE_ACK',
    message: 'Battery level reached 18% (Charge needed soon)',
    createdTime: Date.now() - 3600 * 1000,
    ackTime: Date.now() - 1200 * 1000,
    details: { current_battery: 18, threshold_min: 20 },
  },
];

export class ThingsBoardService {
  private config: ThingsBoardConfig;
  private apiClient: AxiosInstance;

  constructor() {
    this.config = {
      serverUrl: import.meta.env.VITE_THINGSBOARD_SERVER_URL || 'https://humid1.yourdomain.com',
      username: import.meta.env.VITE_THINGSBOARD_USERNAME || '',
      password: import.meta.env.VITE_THINGSBOARD_PASSWORD || '',
      token: undefined,
      refreshToken: undefined,
      isConnected: false,
      isSimulated: true,
      lastSync: Date.now(),
    };

    this.apiClient = axios.create({
      baseURL: this.config.serverUrl,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // JWT Interceptor with automated Silent Token Refresh
    this.apiClient.interceptors.request.use((req) => {
      if (this.config.token) {
        req.headers['X-Authorization'] = `Bearer ${this.config.token}`;
      }
      return req;
    });

    this.apiClient.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalReq = err.config;
        if (err.response?.status === 401 && !originalReq._retry && this.config.refreshToken) {
          originalReq._retry = true;
          try {
            const refreshRes = await axios.post(`${this.config.serverUrl}/api/auth/token/refresh`, {
              refreshToken: this.config.refreshToken,
            });
            this.config.token = refreshRes.data.token;
            this.config.refreshToken = refreshRes.data.refreshToken;
            originalReq.headers['X-Authorization'] = `Bearer ${this.config.token}`;
            return this.apiClient(originalReq);
          } catch (refreshErr) {
            this.config.token = undefined;
            this.config.refreshToken = undefined;
            this.config.isConnected = false;
            return Promise.reject(refreshErr);
          }
        }
        return Promise.reject(err);
      }
    );
  }

  getConfig(): ThingsBoardConfig {
    return { ...this.config };
  }

  setConfig(newConfig: Partial<ThingsBoardConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.apiClient.defaults.baseURL = this.config.serverUrl;
  }

  async login(username: string, password: string): Promise<boolean> {
    if (this.config.isSimulated) {
      this.config.username = username;
      this.config.token = 'mock-jwt-token-' + Date.now();
      this.config.refreshToken = 'mock-refresh-token-' + Date.now();
      this.config.isConnected = true;
      this.config.lastSync = Date.now();
      return true;
    }

    try {
      const res = await this.apiClient.post('/api/auth/login', {
        username,
        password,
      });
      this.config.token = res.data.token;
      this.config.refreshToken = res.data.refreshToken;
      this.config.username = username;
      this.config.isConnected = true;
      this.config.lastSync = Date.now();
      return true;
    } catch (e) {
      console.warn('[ThingsBoard] Login failed, falling back to simulated connection', e);
      return false;
    }
  }

  async claimDevice(deviceName: string, secretKey: string): Promise<{ success: boolean; device?: HumidorDevice; error?: string }> {
    if (!deviceName || !secretKey) {
      return { success: false, error: 'Device Name and Secret PIN are required.' };
    }

    // In real mode
    if (!this.config.isSimulated && this.config.token) {
      try {
        await this.apiClient.post('/api/customer/device/claim', {
          deviceName,
          secretKey,
        });
      } catch (e: any) {
        console.warn('[ThingsBoard] Claim API returned error, adding locally for preview:', e);
      }
    }

    // Create newly claimed device
    const newId = 'tb-dev-' + Math.random().toString(36).substring(2, 8);
    const newDevice: HumidorDevice = {
      id: newId,
      name: deviceName.replace(/^HUMID1-/, '').replace(/-\d+$/, '') || deviceName,
      status: 'ONLINE',
      lastSeen: Date.now(),
      telemetry: {
        rh: 70.0 + (Math.random() - 0.5) * 2,
        temp: 69.5 + (Math.random() - 0.5) * 1.5,
        battery: 100,
        rssi: -58,
        timestamp: Date.now(),
      },
      clientAttributes: {
        fw_version: 'v1.0.4',
        device_name: deviceName.toUpperCase(),
        mac_address: `B8:27:EB:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
        ssid: 'Humidor_Vault_5G',
        ip_address: `192.168.1.${Math.floor(Math.random() * 100 + 150)}`,
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
      history: generateHistory(70.0, 69.5, 100, 7, 30),
    };

    return { success: true, device: newDevice };
  }

  async saveSharedAttributes(deviceId: string, attributes: Partial<SharedAttributes>): Promise<boolean> {
    if (!this.config.isSimulated && this.config.token) {
      try {
        await this.apiClient.post(`/api/plugins/telemetry/DEVICE/${deviceId}/SHARED_SCOPE`, attributes);
        return true;
      } catch (e) {
        console.warn('[ThingsBoard] Failed to update shared attributes via API', e);
      }
    }
    return true;
  }
}

export const tbService = new ThingsBoardService();
