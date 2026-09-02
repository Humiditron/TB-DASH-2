export type DeviceStatus = 'ONLINE' | 'SLEEP' | 'OFFLINE';
export type DeviceTheme = 'DARK' | 'LIGHT' | 'STEALTH';
export type OtaState = 'IDLE' | 'QUEUED' | 'DOWNLOADING' | 'VERIFIED' | 'UPDATING' | 'SUCCESS' | 'FAILED';
export type AlarmSeverity = 'CRITICAL' | 'MAJOR' | 'WARNING';
export type AlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';

export interface TelemetryData {
  rh: number;            // Relative Humidity in % (ideal 65% - 75%)
  temp: number;          // Temperature in °F (alert ceiling > 75°F)
  battery: number;       // Battery percentage 0-100% (alert < 20%)
  rssi: number;          // Signal strength in dBm (-30 to -90)
  timestamp: number;     // Epoch millisecond timestamp
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
  sleep_interval_sec: number; // 60s to 3600s
  device_theme: DeviceTheme;
  sound_enabled: boolean;     // Locked if has_sd_card === false || audio_synced === false
  auto_update_enabled: boolean;
  manual_ota_trigger: boolean;
}

export interface HumidorDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastActivityTime: number;
  telemetry: TelemetryData;
  clientAttributes: ClientAttributes;
  sharedAttributes: SharedAttributes;
  fw_state: OtaState;
  fw_progress: number; // 0 to 100
  latestFwAvailable: string;
}

export interface HistoricalTelemetryPoint {
  timestamp: number;
  timeLabel: string;
  rh: number;
  temp: number;
  battery?: number;
}

export interface HumidorAlarm {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  createdTime: number;
  details: string;
}

export interface ThingsBoardConfig {
  serverUrl: string;
  thingsboardToken?: string;
  authentikUrl?: string;
  authentikClientId?: string;
  authentikAppSlug?: string;
  isDemoMode: boolean;
  isConnected: boolean;
}

export type TempUnit = 'F' | 'C';
