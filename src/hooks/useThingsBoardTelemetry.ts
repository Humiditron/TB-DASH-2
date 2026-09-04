import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDevice,
  fetchLatestTelemetry,
  type LatestTelemetryMap,
} from '../services/tbClientService';
import type { Device } from '@enerlab/thingsboard-client';

export interface UseTelemetryOptions {
  deviceId: string;
  keys?: string[];
  pollIntervalMs?: number;
  autoRefresh?: boolean;
  onUnauthorized?: () => void;
}

export interface UseTelemetryResult {
  device: Device | null;
  telemetry: LatestTelemetryMap;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  lastCheckedTs: number | null;
  isDeviceSleeping: boolean;
  newPacketArrived: boolean;
  isPaused: boolean;
  togglePause: () => void;
  refresh: (force?: boolean) => Promise<void>;
}

export function useThingsBoardTelemetry({
  deviceId,
  keys,
  pollIntervalMs = 10000,
  autoRefresh = true,
  onUnauthorized,
}: UseTelemetryOptions): UseTelemetryResult {
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetryMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [lastCheckedTs, setLastCheckedTs] = useState<number | null>(null);
  const [isDeviceSleeping, setIsDeviceSleeping] = useState<boolean>(false);
  const [newPacketArrived, setNewPacketArrived] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(!autoRefresh);

  const isMountedRef = useRef<boolean>(true);
  const lastKnownPayloadTsRef = useRef<number>(0);
  const packetArrivedTimeoutRef = useRef<any>(null);
  const deviceLoadedForId = useRef<string | null>(null);

  const onUnauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const keysString = keys ? keys.join(',') : '';

  const prevDeviceIdRef = useRef<string>(deviceId);

  // Reset telemetry cache when active device changes
  useEffect(() => {
    if (prevDeviceIdRef.current !== deviceId) {
      prevDeviceIdRef.current = deviceId;
      lastKnownPayloadTsRef.current = 0;
      setTelemetry({});
      setLastUpdated(null);
      setIsDeviceSleeping(false);
      setNewPacketArrived(false);
    }
  }, [deviceId]);

  // 1. Initial Device Metadata Load (Fetched only once per deviceId)
  useEffect(() => {
    if (!deviceId) return;

    let cancelled = false;
    const loadDeviceMetadata = async () => {
      try {
        const deviceData = await fetchDevice(deviceId);
        if (!cancelled && isMountedRef.current) {
          setDevice(deviceData);
          deviceLoadedForId.current = deviceId;
        }
      } catch (err: any) {
        // Non-fatal if telemetry still works
        console.warn('[TelemetryHook] fetchDevice warning:', err?.message);
      }
    };

    if (deviceLoadedForId.current !== deviceId) {
      loadDeviceMetadata();
    }

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  // 2. Fetch Latest Telemetry - ONLY refreshes state when NEW data hits ThingsBoard
  const loadTelemetry = useCallback(
    async (force: boolean = false) => {
      if (!deviceId) return;
      // Do not poll if browser tab is in background unless forced
      if (!force && typeof document !== 'undefined' && document.hidden) {
        return;
      }

      try {
        setError(null);
        if (force && lastKnownPayloadTsRef.current === 0) {
          setLoading(true);
        }
        const telemetryData = await fetchLatestTelemetry(deviceId, keys);

        if (!isMountedRef.current) return;

        // Find the newest timestamp among all returned timeseries values
        let latestPayloadTs = 0;
        const entries = Object.values(telemetryData);
        for (const entry of entries) {
          if (entry && typeof entry.ts === 'number' && entry.ts > latestPayloadTs) {
            latestPayloadTs = entry.ts;
          }
        }

        const now = Date.now();
        setLastCheckedTs(now);

        const isInitial = lastKnownPayloadTsRef.current === 0;
        const isNewData = latestPayloadTs > 0 && latestPayloadTs > lastKnownPayloadTsRef.current;

        // ONLY refresh live data if new data actually arrived on ThingsBoard
        if (isInitial || isNewData) {
          lastKnownPayloadTsRef.current = latestPayloadTs > 0 ? latestPayloadTs : -1;
          setTelemetry(telemetryData);
          setLastUpdated(latestPayloadTs > 0 ? latestPayloadTs : now);

          if (isNewData && !isInitial) {
            setNewPacketArrived(true);
            if (packetArrivedTimeoutRef.current) {
              clearTimeout(packetArrivedTimeoutRef.current);
            }
            packetArrivedTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setNewPacketArrived(false);
            }, 3000);
          }
        }

        // Variable sleep state tracking
        if (latestPayloadTs > 0) {
          const ageMs = now - latestPayloadTs;
          // If no new packet in this cycle or packet is older than 2 mins, device is sleeping
          setIsDeviceSleeping(!isNewData || ageMs > 120 * 1000);
        }

        setLoading(false);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const msg = err.message || 'Error fetching telemetry from ThingsBoard';
        setError((prev) => (prev === msg ? prev : msg));
        setLoading(false);

        if (msg.includes('THINGSBOARD_UNAUTHORIZED')) {
          setIsPaused((prev) => (prev ? prev : true));
          if (onUnauthorizedRef.current) {
            onUnauthorizedRef.current();
          }
        }
      }
    },
    [deviceId, keysString]
  );

  // 3. Polling lifecycle with tab visibility listening
  useEffect(() => {
    isMountedRef.current = true;

    if (isPaused) {
      return;
    }

    // Immediate initial fetch
    loadTelemetry(true);

    const interval = setInterval(() => {
      loadTelemetry(false);
    }, pollIntervalMs);

    // Refresh immediately when user returns to the tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && !isPaused) {
        loadTelemetry(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (packetArrivedTimeoutRef.current) {
        clearTimeout(packetArrivedTimeoutRef.current);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [loadTelemetry, pollIntervalMs, isPaused]);

  return {
    device,
    telemetry,
    loading,
    error,
    lastUpdated,
    lastCheckedTs,
    isDeviceSleeping,
    newPacketArrived,
    isPaused,
    togglePause: () => setIsPaused((prev) => !prev),
    refresh: () => loadTelemetry(true),
  };
}
