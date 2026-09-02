import React, { useState } from 'react';
import {
  ShieldCheck,
  PlusCircle,
  KeyRound,
  Cpu,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Radio,
  Wifi,
} from 'lucide-react';
import { HumidorDevice, AuthentikUser, ClaimLogEntry } from '../types';
import { tbClient } from '../services/tbClient';

interface ClaimingHubProps {
  currentUser: AuthentikUser | null;
  devices: HumidorDevice[];
  onDeviceClaimed: (device: HumidorDevice) => void;
  onDeviceReclaimed: (deviceId: string, deviceName: string) => void;
  onSelectDevice: (deviceId: string) => void;
  selectedDeviceId: string;
}

const PRESET_UNITS = [
  { name: 'HUMID1-CABINET-01', pin: '882190', label: 'Main Cabinet (ESP32-S3)' },
  { name: 'HUMID1-AGING-02', pin: '419024', label: 'Aging Vault Box (ESP32-C3)' },
  { name: 'HUMID1-TRAVEL-03', pin: '730198', label: 'Travel Case (ESP32 Pico)' },
  { name: 'HUMID1-VAULT-04', pin: '556129', label: 'Reserve Locker (ESP32-S3)' },
];

export const ClaimingHub: React.FC<ClaimingHubProps> = ({
  currentUser,
  devices,
  onDeviceClaimed,
  onDeviceReclaimed,
  onSelectDevice,
  selectedDeviceId,
}) => {
  const [deviceName, setDeviceName] = useState('HUMID1-VAULT-04');
  const [secretKey, setSecretKey] = useState('556129');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; raw?: unknown } | null>(null);
  const [claimLogs, setClaimLogs] = useState<ClaimLogEntry[]>(tbClient.getClaimLogs());
  const [isRefreshingList, setIsRefreshingList] = useState(false);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setLastResult({ success: false, message: 'Please enter a Device Name / Identifier.' });
      return;
    }

    setIsSubmitting(true);
    setLastResult(null);

    const result = await tbClient.claimDevice(deviceName.trim(), secretKey.trim());
    setIsSubmitting(false);
    setClaimLogs(tbClient.getClaimLogs());

    if (result.success && result.device) {
      setLastResult({
        success: true,
        message: `Device "${deviceName.trim()}" successfully claimed and provisioned to your customer account!`,
        raw: result.rawResponse,
      });
      onDeviceClaimed(result.device);
    } else {
      setLastResult({
        success: false,
        message: result.error || 'Failed to claim device with ThingsBoard.',
        raw: result.rawResponse,
      });
    }
  };

  const handlePresetSelect = (presetName: string, presetPin: string) => {
    setDeviceName(presetName);
    setSecretKey(presetPin);
    setLastResult(null);
  };

  const handleReclaimDevice = async (device: HumidorDevice) => {
    if (!confirm(`Are you sure you want to unclaim and release "${device.name}" (${device.clientAttributes.device_name})?`)) {
      return;
    }

    const res = await tbClient.reclaimDevice(device.clientAttributes.device_name);
    setClaimLogs(tbClient.getClaimLogs());

    if (res.success) {
      onDeviceReclaimed(device.id, device.clientAttributes.device_name);
    } else {
      alert(`Error releasing device: ${res.error}`);
    }
  };

  const handleRefreshDeviceList = async () => {
    setIsRefreshingList(true);
    const updated = await tbClient.fetchCustomerDevices();
    setIsRefreshingList(false);
    if (updated.length > 0) {
      onDeviceClaimed(updated[0]);
    }
  };

  return (
    <div id="claiming-hub" className="space-y-8 animate-fade-in">
      {/* Customer Account Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                {currentUser?.name || currentUser?.email || 'Authentik Customer User'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {currentUser?.authority || 'CUSTOMER_USER'}
              </span>
              {currentUser?.isSimulated && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer ID:{' '}
              <span className="font-mono text-slate-300">
                {currentUser?.customerId || '784f394c-42b6-435a-983c-b7beff2784f9'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshDeviceList}
            disabled={isRefreshingList}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingList ? 'animate-spin' : ''}`} />
            <span>Sync Registered Devices</span>
          </button>
        </div>
      </div>

      {/* Grid: Left = Claiming Form | Right = Registered Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Device Claiming Console */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <PlusCircle className="w-5 h-5" />
                <h3 className="font-bold text-slate-100 text-base">Claim New Humidor Unit</h3>
              </div>
              <p className="text-xs text-slate-400">
                Bind unassigned ESP32 hardware to your ThingsBoard Customer register using the device claim key.
              </p>
            </div>

            {/* Quick Presets for Easy Testing */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Test Hardware Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_UNITS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePresetSelect(p.name, p.pin)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                      deviceName === p.name
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono font-bold text-[11px] truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Claiming Form */}
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Device Name / Identifier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. HUMID1-CABINET-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <Cpu className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must match the hardware device name configured in ThingsBoard
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Secret Claim PIN / Authorization Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="e.g. 882190"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Found on the unit packaging or on-screen OLED pairing prompt
                </span>
              </div>

              {/* Result Notice */}
              {lastResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                    lastResult.success
                      ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                  }`}
                >
                  {lastResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{lastResult.message}</p>
                    {lastResult.raw && (
                      <pre className="text-[10px] font-mono bg-slate-950/60 p-2 rounded border border-slate-800 max-h-24 overflow-auto">
                        {JSON.stringify(lastResult.raw, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-hub-claim-device"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Claiming with ThingsBoard API...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Claim & Provision Device</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ThingsBoard Claiming Protocol Guide */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>ThingsBoard Claiming Architecture</span>
            </h4>
            <p className="leading-relaxed text-[11px]">
              ThingsBoard enables customer self-provisioning via{' '}
              <code className="text-amber-300 font-mono">POST /api/customer/device/claim</code>. The
              device publishes its claim payload with a secret PIN; when this client submits matching credentials,
              the device is moved into the customer group and unlocked.
            </p>
          </div>
        </div>

        {/* Right Column: Claimed Customer Devices & Registry */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Claimed Devices Inventory ({devices.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Hardware currently linked to your customer register
                </p>
              </div>
            </div>

            {/* Device Cards List */}
            <div className="space-y-3">
              {devices.map((device) => {
                const isSelected = device.id === selectedDeviceId;
                return (
                  <div
                    key={device.id}
                    className={`p-4 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left Device Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">
                            {device.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                              device.status === 'ONLINE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {device.status}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            CLAIMED
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                          <span>Identifier: {device.clientAttributes.device_name}</span>
                          <span>•</span>
                          <span>MAC: {device.clientAttributes.mac_address}</span>
                          <span>•</span>
                          <span>FW: {device.clientAttributes.fw_version}</span>
                        </div>
                      </div>

                      {/* Right Telemetry Snapshot & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono text-xs hidden sm:block">
                          <div className="text-emerald-400 font-bold">{device.telemetry.rh}% RH</div>
                          <div className="text-slate-400">{device.telemetry.temp}°F</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectDevice(device.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isSelected ? 'Active View' : 'Monitor'}
                        </button>

                        <button
                          type="button"
                          title="Unclaim and release device"
                          onClick={() => handleReclaimDevice(device)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {devices.length === 0 && (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No devices currently claimed. Use the form on the left to claim your first humidor unit.
                </div>
              )}
            </div>
          </div>

          {/* Activity / API Diagnostics Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>ThingsBoard Claiming API Activity Log</span>
              </h3>
              {claimLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    tbClient.clearClaimLogs();
                    setClaimLogs([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {claimLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold">{log.deviceName}</span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300">{log.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Status: {log.status}</span>
                    {log.httpStatus && <span>HTTP {log.httpStatus}</span>}
                  </div>
                </div>
              ))}

              {claimLogs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  No claim requests logged yet in this session.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
