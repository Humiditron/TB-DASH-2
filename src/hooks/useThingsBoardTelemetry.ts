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
  refresh: () => Promise<void>;
}

export function useThingsBoardTelemetry({
  deviceId,
  keys,
  pollIntervalMs = 4000,
  autoRefresh = true,
  onUnauthorized,
}: UseTelemetryOptions): UseTelemetryResult {
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetryMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const isMountedRef = useRef<boolean>(true);

  const loadData = useCallback(async () => {
    if (!deviceId) return;
    try {
      setError(null);
      const [deviceData, telemetryData] = await Promise.all([
        fetchDevice(deviceId),
        fetchLatestTelemetry(deviceId, keys),
      ]);

      if (isMountedRef.current) {
        setDevice(deviceData);
        setTelemetry(telemetryData);
        setLastUpdated(Date.now());
        setLoading(false);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      const msg = err.message || 'Error fetching telemetry from ThingsBoard';
      setError(msg);
      setLoading(false);

      if (msg.includes('THINGSBOARD_UNAUTHORIZED') && onUnauthorized) {
        onUnauthorized();
      }
    }
  }, [deviceId, keys, onUnauthorized]);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    loadData();

    if (!autoRefresh) {
      return () => {
        isMountedRef.current = false;
      };
    }

    const interval = setInterval(() => {
      loadData();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadData, pollIntervalMs, autoRefresh]);

  return {
    device,
    telemetry,
    loading,
    error,
    lastUpdated,
    refresh: loadData,
  };
}
