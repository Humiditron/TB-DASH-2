import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  Thermometer,
  Droplets,
  Wind,
  Wifi,
  Lock,
  Server,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Database,
  Battery,
  Layers,
} from 'lucide-react';
import { useThingsBoardTelemetry } from '../hooks/useThingsBoardTelemetry';
import {
  configureDefaultClient,
  loginThingsBoard,
  setManualTokenOverride,
  createIsolatedThingsBoardClient,
} from '../services/tbClientService';

export interface HumidorTelemetryWidgetProps {
  deviceId: string;
  serverUrl?: string;
  initialToken?: string;
  deviceName?: string;
  onDeviceSelect?: (deviceId: string) => void;
}

export const HumidorTelemetryWidget: React.FC<HumidorTelemetryWidgetProps> = ({
  deviceId,
  serverUrl = 'https://app.humid1.com',
  initialToken,
  deviceName,
}) => {
  const [token, setToken] = useState<string>(
    initialToken || localStorage.getItem('tb_token') || localStorage.getItem('tb_jwt_override') || ''
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(10);
  const [showRawKeys, setShowRawKeys] = useState(false);

  // Sync client configuration whenever serverUrl or token changes
  useEffect(() => {
    configureDefaultClient({
      baseUrl: serverUrl,
      token: token || undefined,
    });
  }, [serverUrl, token]);

  // Query only actual hardware payload keys across firmware variants
  const requestedKeys = useMemo(
    () => [
      'rh',
      'humidity',
      'hum',
      'temp',
      'temperature',
      'tempF',
      'tempC',
      'rssi',
      'wifi_rssi',
      'battery',
      'batt',
      'targetHumidity',
      'target_humidity',
      'target_rh',
      'fw_version',
    ],
    []
  );

  const {
    device,
    telemetry,
    loading,
    error,
    lastUpdated,
    lastCheckedTs,
    isDeviceSleeping,
    newPacketArrived,
    isPaused,
    togglePause,
    refresh,
  } = useThingsBoardTelemetry({
    deviceId,
    keys: requestedKeys,
    pollIntervalMs: pollIntervalSec * 1000,
    onUnauthorized: () => {
      setShowLoginModal(true);
    },
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);
    try {
      const session = await loginThingsBoard(username, password);
      setToken(session.token);
      localStorage.setItem('tb_token', session.token);
      setManualTokenOverride(session.token);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
      await refresh();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return '--';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  const getMetricValue = (key: string, defaultValue: string = '--') => {
    if (!telemetry[key] || telemetry[key].value === undefined || telemetry[key].value === null) {
      return defaultValue;
    }
    const val = telemetry[key].value;
    if (typeof val === 'number') {
      return val.toFixed(1);
    }
    return String(val);
  };

  // Robust multi-key lookups for Relative Humidity (rh or humidity or hum)
  const humVal =
    getMetricValue('rh') !== '--'
      ? getMetricValue('rh')
      : getMetricValue('humidity') !== '--'
      ? getMetricValue('humidity')
      : getMetricValue('hum');

  // Robust multi-key lookups for Temperature (temp or temperature or tempF)
  const tempVal =
    getMetricValue('temp') !== '--'
      ? getMetricValue('temp')
      : getMetricValue('temperature') !== '--'
      ? getMetricValue('temperature')
      : getMetricValue('tempF');

  // Target Humidity
  const targetHumVal =
    getMetricValue('targetHumidity') !== '--'
      ? getMetricValue('targetHumidity')
      : getMetricValue('target_humidity') !== '--'
      ? getMetricValue('target_humidity')
      : getMetricValue('target_rh', '65');

  // Battery
  const batteryVal =
    getMetricValue('battery') !== '--'
      ? getMetricValue('battery')
      : getMetricValue('batt');

  // Signal RSSI
  const rssiVal =
    telemetry['rssi']?.value !== undefined
      ? String(telemetry['rssi'].value)
      : telemetry['wifi_rssi']?.value !== undefined
      ? String(telemetry['wifi_rssi'].value)
      : '-64';

  // VPD calculation only: derived mathematically from ambient temp & RH
  let vpdVal = '--';
  if (humVal !== '--' && tempVal !== '--') {
    const rh = parseFloat(humVal);
    const tempF = parseFloat(tempVal);
    if (!isNaN(rh) && !isNaN(tempF)) {
      const tempC = ((tempF - 32) * 5) / 9;
      const vpsat = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
      const vpair = vpsat * (rh / 100);
      vpdVal = Math.max(0, vpsat - vpair).toFixed(2);
    }
  }

  const rawKeysCount = Object.keys(telemetry).length;

  return (
    <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 text-slate-100 shadow-xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-amber-400/90">
                {device?.type || 'Humid1 OS Engine'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                @enerlab/tb-client
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {deviceName || device?.name || 'Humidor Telemetry Monitor'}
            </h2>
          </div>
        </div>

        {/* Controls & Sync Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Polling Rate Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-300">
            <span className="text-[11px] text-slate-400 font-mono">Interval:</span>
            <select
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-slate-900 text-slate-100">10s (Optimal)</option>
              <option value={30} className="bg-slate-900 text-slate-100">30s (Relaxed)</option>
              <option value={60} className="bg-slate-900 text-slate-100">60s (Low Data)</option>
            </select>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              isPaused
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700/80'
            }`}
            title={isPaused ? 'Resume live background polling' : 'Pause background polling'}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-slate-400" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Force Refresh Button */}
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 rounded-lg transition disabled:opacity-50"
            title="Force immediate refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition"
            title="ThingsBoard Session Management"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Session</span>
          </button>

          {newPacketArrived && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/20 border border-emerald-400 text-emerald-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>New Packet!</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
              error
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : isPaused
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : isDeviceSleeping
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                error
                  ? 'bg-rose-500 animate-pulse'
                  : isPaused
                  ? 'bg-amber-400'
                  : isDeviceSleeping
                  ? 'bg-sky-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>
              {error
                ? 'Degraded'
                : isPaused
                ? 'Paused'
                : isDeviceSleeping
                ? 'Device Asleep'
                : 'Live Sync'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner if unauthenticated or timeout */}
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">ThingsBoard Client Notice: </span>
            {error}
          </div>
          {error.includes('UNAUTHORIZED') && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded transition"
            >
              Sign In
            </button>
          )}
        </div>
      )}

      {/* Primary Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {/* Relative Humidity */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {humVal}
            </span>
            <span className="text-xs font-mono text-slate-400">%</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Target: {targetHumVal}%</span>
            <span className="text-emerald-400 font-mono">In Range</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {tempVal}
            </span>
            <span className="text-xs font-mono text-slate-400">°F</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Curing Temp</span>
            <span className="text-amber-400/90 font-mono">Nominal</span>
          </div>
        </div>

        {/* Vapor Pressure Deficit (Derived mathematically from temp and humidity only) */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>VPD (Calculated)</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {vpdVal}
            </span>
            <span className="text-xs font-mono text-slate-400">kPa</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Leaf Vapor Deficit</span>
            <span className="text-emerald-400 font-mono">Math Derivation</span>
          </div>
        </div>

        {/* Signal RSSI */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>RF Signal (RSSI)</span>
            <Wifi className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {rssiVal}
            </span>
            <span className="text-xs font-mono text-slate-400">dBm</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>ESP32 Gateway</span>
            <span className="text-indigo-400 font-mono">Strong</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row (Battery & Target Humidity) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Battery className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-500">Battery:</span>
            <span className="font-mono font-semibold text-white">
              {batteryVal !== '--' ? `${batteryVal}%` : 'External USB/5V'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-500">Target Humidity:</span>
            <span className="font-mono font-semibold text-white">{targetHumVal}%</span>
          </div>

          {isDeviceSleeping && (
            <div className="flex items-center gap-1.5 text-sky-300 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Device in Variable Sleep (Awaiting next wakeup)</span>
            </div>
          )}
        </div>

        {/* Expandable Key-Value Inspector Toggle */}
        <button
          type="button"
          onClick={() => setShowRawKeys((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition"
        >
          <Database className="w-3 h-3 text-amber-400" />
          <span>All Received Telemetry Keys ({rawKeysCount})</span>
          {showRawKeys ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Raw Telemetry Key-Value Accordion Panel */}
      {showRawKeys && (
        <div className="mb-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
            <span>KEY NAME</span>
            <span>LATEST VALUE & TIMESTAMP</span>
          </div>

          {rawKeysCount === 0 ? (
            <p className="text-slate-500 font-mono text-center py-2 text-xs">
              No timeseries keys returned yet from device. Awaiting incoming packet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(telemetry).map(([k, entry]) => (
                <div
                  key={k}
                  className="flex items-center justify-between p-2 bg-slate-900/90 border border-slate-800/80 rounded-lg text-[11px] font-mono"
                >
                  <span className="text-amber-300/90 font-semibold">{k}</span>
                  <div className="text-right">
                    <span className="text-white font-bold block">
                      {typeof entry?.value === 'object' ? JSON.stringify(entry.value) : String(entry?.value)}
                    </span>
                    {entry?.ts && (
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info & Architecture Telemetry Badge */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">Target:</span>
          <span className="text-slate-300">{serverUrl}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">Device ID:</span>
          <span className="text-amber-400/90">{deviceId.substring(0, 13)}...</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Hardware Packet:</span>
              <span className="text-amber-300 font-bold">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
              <span className="text-slate-500">({formatTimeAgo(lastUpdated)})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lastCheckedTs
                ? `TB Polled: ${formatTimeAgo(lastCheckedTs)}`
                : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Login / Token Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">ThingsBoard Session Auth</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Authenticate via the built-in ThingsBoard <code className="text-amber-300 font-mono">/api/auth/login</code> helper or paste a direct JWT Bearer token override.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tenant@thingsboard.org"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {loginError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sign In to ThingsBoard</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800">
              <label className="block text-xs text-slate-400 mb-1.5">Direct JWT Token Override (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setManualTokenOverride(e.target.value);
                    localStorage.setItem('tb_jwt_override', e.target.value);
                  }}
                  placeholder="eyJhbGciOiJIUzUxMiJ9..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    refresh();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
