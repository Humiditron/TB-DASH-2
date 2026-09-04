import {
  client,
  login,
  logout,
  setupAuth,
  getDeviceById,
  getLatestTimeseries,
  getAttributesByScope,
  type Device,
} from '@enerlab/thingsboard-client';
import {
  zDevice,
} from '@enerlab/thingsboard-client/zod';
import { z } from 'zod';
import { normalizeBearerToken, applyThingsBoardClientAuth } from '../utils/authTokens';
import { thingsboard } from './thingsboard';

export type TBClientInstance = typeof client;

export interface ClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
}

export interface TelemetryDataPoint {
  ts: number;
  value: number | string | boolean | any;
}

export const zTsKvEntry = z.object({
  ts: z.number(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.string(), z.any())]),
});

export type LatestTelemetryMap = Record<string, TelemetryDataPoint>;

export interface TelemetryHistoryPoint {
  ts: number;
  value: number | string;
}

/**
 * 1. Global / Singleton Client Configuration Helper
 * Configures baseUrl and sets up auth token handling
 */
export function configureDefaultClient({ baseUrl, token }: ClientOptions): void {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanToken = normalizeBearerToken(token);
  applyThingsBoardClientAuth(client, cleanToken, cleanBaseUrl);
}

/**
 * 2. Session Management via built-in login() helper from @enerlab/thingsboard-client
 * Authenticates against ThingsBoard REST endpoint (/api/auth/login)
 * and automatically binds the JWT token to the client.
 */
export async function loginThingsBoard(
  username: string,
  password: string,
  customClient: TBClientInstance = client
): Promise<{ token: string; refreshToken: string }> {
  try {
    const authData = await login(username, password, {
      client: customClient as any,
    });

    const cleanToken = normalizeBearerToken(authData.token)!;
    const cleanRefresh = normalizeBearerToken(authData.refreshToken)!;
    applyThingsBoardClientAuth(customClient, cleanToken);

    return {
      token: cleanToken,
      refreshToken: cleanRefresh,
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Authentication failed: Invalid credentials');
  }
}

/**
 * Log out and clear session credentials
 */
export function logoutThingsBoard(customClient: TBClientInstance = client): void {
  applyThingsBoardClientAuth(customClient, null);
}

/**
 * 3. Manual Token Override Support
 * Allows overriding active JWT token from localStorage or session state.
 */
export function setManualTokenOverride(
  token: string,
  customClient: TBClientInstance = client
): void {
  const cleanToken = normalizeBearerToken(token);
  applyThingsBoardClientAuth(customClient, cleanToken);
}

/**
 * 4. Isolated Client Instances
 * Facilitates isolated client instances for multi-tenant or multi-server scenarios.
 */
export function createIsolatedThingsBoardClient(options: ClientOptions): TBClientInstance {
  // Clone singleton configuration
  const customClient = Object.create(client) as TBClientInstance;
  const cleanToken = normalizeBearerToken(options.token);
  applyThingsBoardClientAuth(customClient, cleanToken, options.baseUrl);
  return customClient;
}

/**
 * 5. Fetch Device Details with Zod Boundary Validation
 */
export async function fetchDevice(
  deviceId: string,
  customClient: TBClientInstance = client
): Promise<Device> {
  if (thingsboard.isDemoMode()) {
    const devices = thingsboard.getDevices();
    const found = devices.find((d) => d.id === deviceId);
    return {
      id: { id: deviceId, entityType: 'DEVICE' },
      name: found?.name || 'HUMID1-CABINET-01',
      type: 'HUMIDOR_PRECISION_SENSOR',
      label: found?.name || 'Master Humidor Cabinet',
      createdTime: Date.now() - 864000000,
    } as unknown as Device;
  }

  try {
    const response = await getDeviceById({
      client: customClient as any,
      path: {
        deviceId,
      },
    });

    if (response.error || !response.data) {
      handleApiError(response.error, 'Failed to fetch device details');
    }

    return zDevice.parse(response.data) as unknown as Device;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw new Error(`Device schema validation error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 6. Fetch Latest Telemetry Timeseries with Zod Validation
 * Bypasses erroneous SDK Zod validator by overriding requestValidator and responseValidator
 */
export async function fetchLatestTelemetry(
  deviceId: string,
  keys?: string[],
  customClient: TBClientInstance = client
): Promise<LatestTelemetryMap> {
  if (thingsboard.isDemoMode()) {
    const devices = thingsboard.getDevices();
    const target = devices.find((d) => d.id === deviceId) || devices[0];
    const now = Date.now();
    const tel = target?.telemetry || { rh: 69.4, temp: 68.5, battery: 94, rssi: -58 };
    return {
      rh: { ts: now, value: tel.rh },
      humidity: { ts: now, value: tel.rh },
      temp: { ts: now, value: tel.temp },
      temperature: { ts: now, value: tel.temp },
      battery: { ts: now, value: tel.battery },
      rssi: { ts: now, value: tel.rssi },
      targetHumidity: { ts: now, value: 70 },
      target_humidity: { ts: now, value: 70 },
    };
  }

  const queryObj: any = {
    useStrictDataTypes: true,
  };
  if (keys && keys.length > 0) {
    queryObj.keys = keys.join(',');
  }

  const response = await getLatestTimeseries({
    client: customClient as any,
    path: {
      entityType: 'DEVICE',
      entityId: deviceId,
    },
    query: queryObj,
    // Disable client-side buggy Zod request validator in @enerlab/thingsboard-client
    requestValidator: undefined,
    responseValidator: undefined,
  } as any);

  if (response.error || !response.data) {
    handleApiError(response.error, 'Failed to fetch latest telemetry');
  }

  const rawData = response.data as Record<string, Array<{ ts: number; value: any }>>;
  const result: LatestTelemetryMap = {};

  for (const [key, entries] of Object.entries(rawData)) {
    if (entries && entries.length > 0) {
      const parsedEntry = zTsKvEntry.safeParse(entries[0]);
      if (parsedEntry.success) {
        result[key] = {
          ts: parsedEntry.data.ts,
          value: parsedEntry.data.value,
        };
      } else {
        result[key] = {
          ts: entries[0].ts,
          value: entries[0].value,
        };
      }
    }
  }

  return result;
}

/**
 * 7. Fetch Telemetry History Timeseries
 */
export async function fetchTelemetryHistory(
  deviceId: string,
  keys: string[],
  startTs: number,
  endTs: number,
  limit: number = 100,
  customClient: TBClientInstance = client
): Promise<Record<string, TelemetryHistoryPoint[]>> {
  if (thingsboard.isDemoMode()) {
    const output: Record<string, TelemetryHistoryPoint[]> = {};
    const step = Math.max(1000, Math.floor((endTs - startTs) / Math.min(limit, 50)));
    for (const k of keys) {
      const arr: TelemetryHistoryPoint[] = [];
      let baseVal = k.includes('temp') ? 68.5 : k.includes('battery') ? 94 : 69.4;
      for (let t = startTs; t <= endTs; t += step) {
        baseVal += (Math.random() - 0.5) * 0.4;
        arr.push({ ts: t, value: Number(baseVal.toFixed(1)) });
      }
      output[k] = arr;
    }
    return output;
  }

  const response = await getLatestTimeseries({
    client: customClient as any,
    path: {
      entityType: 'DEVICE',
      entityId: deviceId,
    },
    query: {
      keys: keys.join(','),
      startTs,
      endTs,
      limit: String(limit),
      agg: 'NONE',
    } as any,
    requestValidator: undefined,
    responseValidator: undefined,
  } as any);

  if (response.error || !response.data) {
    handleApiError(response.error, 'Failed to fetch timeseries history');
  }

  const raw = response.data as Record<string, Array<{ ts: number; value: any }>>;
  const output: Record<string, TelemetryHistoryPoint[]> = {};

  for (const [key, dataPoints] of Object.entries(raw)) {
    output[key] = (dataPoints || []).map((dp) => ({
      ts: dp.ts,
      value: dp.value,
    }));
  }

  return output;
}

/**
 * Error Handling Wrapper
 */
function handleApiError(error: any, fallbackMessage: string): never {
  const status = error?.status || error?.statusCode || error?.response?.status;
  if (status === 401 || status === 403) {
    throw new Error('THINGSBOARD_UNAUTHORIZED: Session expired or invalid credentials');
  }
  if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED') {
    throw new Error('THINGSBOARD_TIMEOUT: Network request timed out');
  }
  const msg = error?.message || error?.statusText || fallbackMessage;
  throw new Error(msg);
}
