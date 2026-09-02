import React, { useState } from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { Wifi, WifiOff, Battery, Pause, Play, Sparkles, AlertTriangle } from 'lucide-react';

interface NewsTickerProps {
  devices: HumidorDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  tempUnit: TempUnit;
}

export const NewsTicker: React.FC<NewsTickerProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  tempUnit,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const getTempDisplay = (tempF: number) => {
    if (tempUnit === 'C') {
      return `${(((tempF - 32) * 5) / 9).toFixed(1)}°C`;
    }
    return `${tempF.toFixed(1)}°F`;
  };

  const getRssiQuality = (rssi: number) => {
    if (rssi > -55) return { color: 'text-emerald-400', label: 'Strong' };
    if (rssi > -72) return { color: 'text-amber-400', label: 'Good' };
    return { color: 'text-rose-400', label: 'Weak' };
  };

  // Build repeated device items to ensure seamless infinite looping marquee
  // If devices array is small, duplicate multiple times so track is wide enough
  const repeatCount = Math.max(2, Math.ceil(6 / Math.max(1, devices.length)));
  const repeatedDevices = Array.from({ length: repeatCount * 2 }, () => devices).flat();

  return (
    <div
      id="humid1-news-ticker"
      className="w-full bg-slate-950 border-b border-slate-800 text-xs overflow-hidden relative select-none z-20 group"
    >
      <div className="flex items-center h-10">
        {/* Fixed Lead Tag */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 font-bold px-3 py-2.5 flex items-center gap-2 shrink-0 z-20 shadow-lg border-r border-amber-500/40">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse"></span>
          <span className="tracking-wider uppercase text-[10px] font-mono">FLEET TELEMETRY</span>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 rounded bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition cursor-pointer ml-1"
            title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
          </button>
        </div>

        {/* Left and Right Fade Masks for smooth entry/exit */}
        <div className="absolute left-36 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        {/* Continuous Auto-Scrolling Marquee Track */}
        <div className="flex-1 overflow-hidden relative">
          <div
            className={`animate-ticker flex items-center gap-3 py-1 px-3 ${
              isPaused ? 'ticker-paused' : ''
            }`}
          >
            {repeatedDevices.map((device, idx) => {
              const isSelected = device.id === selectedDeviceId;
              const isRhSafe = device.telemetry.rh >= 65 && device.telemetry.rh <= 75;
              const isTempSafe = device.telemetry.temp <= 75.0;
              const isBatteryLow = device.telemetry.battery < 20;
              const isOffline = device.status === 'OFFLINE';
              const rssiInfo = getRssiQuality(device.telemetry.rssi);

              return (
                <button
                  key={`${device.id}-loop-${idx}`}
                  id={`ticker-chip-${device.id}-${idx}`}
                  onClick={() => onSelectDevice(device.id)}
                  className={`flex items-center gap-2.5 px-3 py-1 rounded-lg transition-all shrink-0 border text-left cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/70 text-slate-100 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOffline
                          ? 'bg-slate-500'
                          : device.status === 'SLEEP'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400 animate-pulse-subtle'
                      }`}
                    />
                    <span className="font-semibold text-slate-200 tracking-tight whitespace-nowrap text-[11px]">
                      {device.name}
                    </span>
                  </div>

                  <div className="h-3 w-px bg-slate-800" />

                  {/* RH Indicator */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-400 text-[10px]">RH:</span>
                    <span
                      className={`font-semibold ${
                        isOffline
                          ? 'text-slate-400'
                          : isRhSafe
                          ? 'text-emerald-400'
                          : device.telemetry.rh < 65
                          ? 'text-sky-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {device.telemetry.rh.toFixed(1)}%
                    </span>
                  </div>

                  {/* Temp Indicator */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-slate-400 text-[10px]">T:</span>
                    <span
                      className={`font-semibold ${
                        isOffline
                          ? 'text-slate-400'
                          : isTempSafe
                          ? 'text-slate-200'
                          : 'text-amber-400'
                      }`}
                    >
                      {getTempDisplay(device.telemetry.temp)}
                    </span>
                  </div>

                  {/* Battery Indicator */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Battery className={`w-3.5 h-3.5 ${isBatteryLow ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
                    <span className={`${isBatteryLow ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {device.telemetry.battery}%
                    </span>
                  </div>

                  {/* RSSI Meter */}
                  <div className="flex items-center" title={`RSSI: ${device.telemetry.rssi} dBm (${rssiInfo.label})`}>
                    {isOffline ? (
                      <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Wifi className={`w-3.5 h-3.5 ${rssiInfo.color}`} />
                    )}
                  </div>

                  {/* Status pill badge */}
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                      isOffline
                        ? 'bg-slate-800 text-slate-400'
                        : device.status === 'SLEEP'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    {device.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
