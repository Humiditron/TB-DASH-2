import React from 'react';
import { HumidorDevice } from '../types';
import { Cpu, HardDrive, Wifi, Radio, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

interface DiagnosticsBarProps {
  device: HumidorDevice;
}

export const DiagnosticsBar: React.FC<DiagnosticsBarProps> = ({ device }) => {
  const { clientAttributes, telemetry, status, lastSeen } = device;

  // Signal calculations
  const getRssiBars = (rssi: number) => {
    if (rssi >= -55) return { bars: 4, label: 'Excellent', color: 'text-emerald-400', barColor: 'bg-emerald-400' };
    if (rssi >= -70) return { bars: 3, label: 'Good', color: 'text-emerald-300', barColor: 'bg-emerald-400' };
    if (rssi >= -80) return { bars: 2, label: 'Fair', color: 'text-amber-400', barColor: 'bg-amber-400' };
    return { bars: 1, label: 'Weak', color: 'text-rose-400', barColor: 'bg-rose-400' };
  };

  const signal = getRssiBars(telemetry.rssi);

  // Time elapsed since last packet
  const getElapsedSeconds = () => {
    const elapsed = Math.floor((Date.now() - lastSeen) / 1000);
    if (elapsed < 60) return `${elapsed}s ago`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    return `${Math.floor(elapsed / 3600)}h ago`;
  };

  return (
    <div id="humid1-diagnostics-bar" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Device Name & Hardware Specs */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-base">{device.name}</h2>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {clientAttributes.device_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                MAC: <span className="text-slate-300">{clientAttributes.mac_address}</span> | IP:{' '}
                <span className="text-slate-300">{clientAttributes.ip_address}</span>
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          {/* Wi-Fi & Firmware */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-400">SSID:</span>
              <span className="text-slate-200 font-semibold">{clientAttributes.ssid}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
              <span className="text-slate-400">FW:</span>
              <span className="text-emerald-400 font-bold">{clientAttributes.fw_version}</span>
            </div>
          </div>
        </div>

        {/* Right: Diagnostics Badges & RSSI */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* RSSI Signal Meter with 4 Visual Bars */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800"
            title={`RSSI: ${telemetry.rssi} dBm (${signal.label})`}
          >
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3, 4].map((barIndex) => (
                <div
                  key={barIndex}
                  className={`w-1 rounded-t-xs ${
                    barIndex <= signal.bars ? signal.barColor : 'bg-slate-750'
                  }`}
                  style={{ height: `${barIndex * 25}%` }}
                />
              ))}
            </div>
            <div className="font-mono text-xs">
              <span className="text-slate-400 mr-1">RSSI:</span>
              <span className={`font-semibold ${signal.color}`}>{telemetry.rssi} dBm</span>
            </div>
          </div>

          {/* MicroSD Hardware Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              clientAttributes.has_sd_card
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{clientAttributes.has_sd_card ? 'SD Card: Inserted' : 'SD Card: Not Detected'}</span>
          </div>

          {/* Audio Assets Sync Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              clientAttributes.audio_synced
                ? 'bg-sky-950/40 border-sky-800/50 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{clientAttributes.audio_synced ? 'Audio Synced' : 'Audio Sync Pending'}</span>
          </div>

          {/* Last Seen / Sleep Window */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{getElapsedSeconds()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
