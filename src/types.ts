export type DeviceStatus = 'ONLINE' | 'SLEEP' | 'OFFLINE';

export interface DeviceTelemetry {
  rh: number; // % relative humidity (65-75% ideal)
  temp: number; // °F ambient temperature (<= 75°F ideal)
  battery: number; // % (warning < 20%)
  rssi: number; // dBm (e.g. -54 dBm)
  timestamp: number; // epoch ms
}

export interface ClientAttributes {
  fw_version: string;
  device_name: string;
  mac_address: string;
  ssid: string;
  ip_address: string;
  has_sd_card: boolean;
  audio_synced: boolean;
}

export interface SharedAttributes {
  sleep_interval_sec: number; // 60s - 3600s
  device_theme: 'DARK' | 'LIGHT' | 'STEALTH';
  sound_enabled: boolean; // Locked if !has_sd_card || !audio_synced
  auto_update_enabled: boolean;
  manual_ota_trigger: boolean;
}

export type FwState = 'IDLE' | 'DOWNLOADING' | 'VERIFIED' | 'UPDATING' | 'SUCCESS' | 'FAILED';

export interface OTAState {
  fw_state: FwState;
  fw_progress: number; // 0 - 100
  target_version: string;
  last_updated?: number;
  message?: string;
}

export type AlarmSeverity = 'CRITICAL' | 'MAJOR' | 'WARNING';
export type AlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';

export interface HumidorAlarm {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  message: string;
  createdTime: number;
  ackTime?: number;
  clearTime?: number;
  details?: Record<string, unknown>;
}

export interface TimeSeriesPoint {
  timestamp: number;
  timeFormatted: string;
  dateFormatted: string;
  rh: number;
  temp: number; // in °F
  tempC: number; // in °C
  battery: number;
  rssi: number;
}

export interface HumidorDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeen: number; // timestamp
  telemetry: DeviceTelemetry;
  clientAttributes: ClientAttributes;
  sharedAttributes: SharedAttributes;
  ota: OTAState;
  history: TimeSeriesPoint[];
}

export interface ThingsBoardConfig {
  serverUrl: string;
  username?: string;
  password?: string;
  token?: string;
  refreshToken?: string;
  isConnected: boolean;
  isSimulated: boolean;
  lastSync?: number;
}

export interface AuthentikUser {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  authority?: string;
  customerId?: string;
  tenantId?: string;
  createdTime?: number;
  isSimulated?: boolean;
  avatarUrl?: string;
}

export interface OAuth2ClientOption {
  name: string;
  icon?: string;
  url: string;
}

export interface ClaimLogEntry {
  id: string;
  timestamp: number;
  deviceName: string;
  secretKey: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  httpStatus?: number;
  message: string;
  responsePayload?: unknown;
}

export type TempUnit = 'F' | 'C';
export type TimeRange = '12h' | '24h' | '3d' | '7d';
export type ActiveTab = 'overview' | 'claim' | 'devices' | 'diagnostics';
