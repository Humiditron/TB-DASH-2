export type DeviceStatus = 'ONLINE' | 'SLEEP' | 'OFFLINE';
export type DeviceTheme = 'DARK' | 'LIGHT' | 'STEALTH';
export type OtaState = 'IDLE' | 'QUEUED' | 'DOWNLOADING' | 'VERIFIED' | 'UPDATING' | 'SUCCESS' | 'FAILED';
export type FwState = OtaState;
export type AlarmSeverity = 'CRITICAL' | 'MAJOR' | 'WARNING';
export type AlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';

export interface TelemetryData {
  rh: number;            // Relative Humidity in % (ideal 65% - 75%)
  temp: number;          // Temperature in °F (alert ceiling > 75°F)
  battery: number;       // Battery percentage 0-100% (alert < 20%)
  rssi: number;          // Signal strength in dBm (-30 to -90)
  timestamp: number;     // Epoch millisecond timestamp
}

export type DeviceTelemetry = TelemetryData;

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
  sleep_interval_sec: number; // 60s to 3600s
  sleep_interval_min?: number;
  device_theme: DeviceTheme | string;
  theme_idx?: number;
  sound_enabled: boolean;     // Locked if has_sd_card === false || audio_synced === false
  audio_lockout?: boolean;
  auto_update_enabled: boolean;
  manual_ota_trigger: boolean;
}

export interface HistoricalTelemetryPoint {
  timestamp: number;
  timeLabel?: string;
  timeFormatted?: string;
  dateFormatted?: string;
  rh: number;
  temp: number;
  tempC?: number;
  battery?: number;
  rssi?: number;
}

export type TimeSeriesPoint = HistoricalTelemetryPoint;

export interface OTAState {
  fw_state: OtaState;
  fw_progress: number;
  target_version: string;
  last_updated?: number;
  message?: string;
}

export interface HumidorDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastActivityTime?: number;
  lastSeen?: number;
  telemetry: TelemetryData;
  clientAttributes: ClientAttributes;
  sharedAttributes: SharedAttributes;
  fw_state?: OtaState;
  fw_progress?: number; // 0 to 100
  latestFwAvailable?: string;
  ota?: OTAState;
  history?: HistoricalTelemetryPoint[];
}

export interface HumidorAlarm {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  createdTime: number;
  details?: any;
  message?: string;
  ackTime?: number;
  clearTime?: number;
}

export interface ThingsBoardConfig {
  serverUrl: string;
  username?: string;
  password?: string;
  thingsboardToken?: string;
  token?: string;
  refreshToken?: string;
  authentikUrl?: string;
  authentikClientId?: string;
  authentikAppSlug?: string;
  isDemoMode?: boolean;
  isConnected?: boolean;
  isSimulated?: boolean;
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

export interface ApiTransaction {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestPayload?: any;
  responseStatus?: number;
  responsePayload?: any;
  durationMs?: number;
  error?: string;
  authHeader?: string;
  hasToken?: boolean;
}

export type TempUnit = 'F' | 'C';
export type TimeRange = '12h' | '24h' | '3d' | '7d';
export type ActiveTab = 'overview' | 'claim' | 'devices' | 'diagnostics';
