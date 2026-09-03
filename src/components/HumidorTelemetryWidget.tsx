import React, { useState, useEffect } from 'react';
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
  const [useIsolatedClient, setUseIsolatedClient] = useState(false);

  // Sync client configuration whenever serverUrl or token changes
  useEffect(() => {
    configureDefaultClient({
      baseUrl: serverUrl,
      token: token || undefined,
    });
  }, [serverUrl, token]);

  const {
    device,
    telemetry,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useThingsBoardTelemetry({
    deviceId,
    keys: [
      'temperature',
      'humidity',
      'vpd',
      'rssi',
      'battery',
      'targetHumidity',
      'heaterActive',
      'fanSpeed',
    ],
    pollIntervalMs: 4000,
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

  const tempVal = getMetricValue('temperature');
  const humVal = getMetricValue('humidity');
  const vpdVal = telemetry['vpd']?.value !== undefined ? Number(telemetry['vpd'].value).toFixed(2) : '--';
  const rssiVal = telemetry['rssi']?.value !== undefined ? String(telemetry['rssi'].value) : '-64';
  const targetHumVal = getMetricValue('targetHumidity', '65');

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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 rounded-lg transition disabled:opacity-50"
            title="Force refresh live telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition"
            title="ThingsBoard Session Management"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Session</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              error
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                error ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span>{error ? 'Degraded' : 'Live Sync'}</span>
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

        {/* Vapor Pressure Deficit */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>VPD Curing Index</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {vpdVal}
            </span>
            <span className="text-xs font-mono text-slate-400">kPa</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Leaf Vapor</span>
            <span className="text-emerald-400 font-mono">Ideal</span>
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

        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {lastUpdated
              ? `Synced at ${new Date(lastUpdated).toLocaleTimeString()}`
              : 'Awaiting telemetry...'}
          </span>
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
