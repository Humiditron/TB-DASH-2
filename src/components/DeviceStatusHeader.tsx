import React from 'react';
import { HumidorDevice } from '../types';
import { 
  Wifi, 
  WifiOff, 
  Cpu, 
  HardDrive, 
  Music, 
  Clock, 
  Network, 
  ChevronDown, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface DeviceStatusHeaderProps {
  device: HumidorDevice;
  allDevices: HumidorDevice[];
  onSelectDevice: (deviceId: string) => void;
}

export const DeviceStatusHeader: React.FC<DeviceStatusHeaderProps> = ({
  device,
  allDevices,
  onSelectDevice,
}) => {
  const getRssiVisual = (rssi: number) => {
    let quality = 'Weak';
    let color = 'text-rose-400';
    let bars = 1;

    if (rssi >= -55) {
      quality = 'Excellent';
      color = 'text-emerald-400';
      bars = 4;
    } else if (rssi >= -70) {
      quality = 'Good';
      color = 'text-amber-400';
      bars = 3;
    } else if (rssi >= -80) {
      quality = 'Fair';
      color = 'text-orange-400';
      bars = 2;
    }

    return (
      <div className="flex items-center gap-2" title={`Signal: ${rssi} dBm (${quality})`}>
        <div className="flex items-end gap-0.5 h-4">
          <div className={`w-1 rounded-xs ${bars >= 1 ? 'bg-emerald-400' : 'bg-slate-700'} h-1.5`} />
          <div className={`w-1 rounded-xs ${bars >= 2 ? (bars >= 3 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-700'} h-2.5`} />
          <div className={`w-1 rounded-xs ${bars >= 3 ? (bars >= 4 ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-700'} h-3.5`} />
          <div className={`w-1 rounded-xs ${bars >= 4 ? 'bg-emerald-400' : 'bg-slate-700'} h-4.5`} />
        </div>
        <span className={`text-xs font-mono font-medium ${color}`}>
          {rssi} dBm
        </span>
      </div>
    );
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Device Selection & Basic Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Device Dropdown */}
          <div className="relative">
            <select
              value={device.id}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="appearance-none bg-slate-950/80 border border-slate-700 hover:border-amber-500/60 rounded-xl px-4 py-2.5 pr-10 text-base font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer transition-all"
            >
              {allDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                  {d.name} {d.status === 'ONLINE' ? '🟢' : d.status === 'SLEEP' ? '⚪' : '🔴'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {device.status === 'ONLINE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry
              </span>
            ) : device.status === 'SLEEP' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Deep Sleep (RTC)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Unreachable / Offline
              </span>
            )}

            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono bg-slate-950/50 px-2.5 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last Packet: {timeAgo(device.lastActivityTime)}</span>
            </div>
          </div>
        </div>

        {/* Right: Hardware & Connection Diagnostic Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Wi-Fi & RSSI */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium truncate max-w-[110px]">{device.clientAttributes.ssid}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            {getRssiVisual(device.telemetry.rssi)}
          </div>

          {/* SD Card Status Badge */}
          <div 
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
              device.clientAttributes.has_sd_card
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/20'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{device.clientAttributes.has_sd_card ? 'SD Card: Inserted' : 'SD Card: Not Detected'}</span>
          </div>

          {/* Audio Synced Badge */}
          <div 
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
              device.clientAttributes.audio_synced
                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>{device.clientAttributes.audio_synced ? 'Audio Synced' : 'Audio Pending'}</span>
          </div>
        </div>
      </div>

      {/* Secondary Diagnostics Row (MAC, IP, Firmware) */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Device Identifier</span>
          <span className="font-mono text-slate-300 font-semibold">{device.clientAttributes.device_name}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Hardware MAC</span>
          <span className="font-mono text-slate-300">{device.clientAttributes.mac_address}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Local IP Address</span>
          <span className="font-mono text-slate-300">{device.clientAttributes.ip_address}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Active Firmware</span>
          <span className="font-mono text-amber-300 font-medium">{device.clientAttributes.fw_version}</span>
        </div>
      </div>
    </div>
  );
};
