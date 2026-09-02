import React from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { 
  Droplets, 
  Thermometer, 
  Battery, 
  Wifi, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface ClimateGaugesProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
  onToggleTempUnit?: () => void;
}

export const ClimateGauges: React.FC<ClimateGaugesProps> = ({
  device,
  tempUnit,
  onToggleTempUnit,
}) => {
  const { rh, temp, battery, rssi } = device.telemetry;

  // Relative Humidity Quality Evaluation
  const getRhStatus = (val: number) => {
    if (val < 62) {
      return {
        label: 'CRITICALLY DRY',
        color: 'text-blue-400',
        bg: 'bg-blue-950/40',
        border: 'border-blue-500/30',
        barColor: 'bg-blue-500',
        desc: 'Wrap cigars immediately or re-season humidor.',
      };
    }
    if (val < 65) {
      return {
        label: 'DRY ZONE',
        color: 'text-sky-300',
        bg: 'bg-sky-950/40',
        border: 'border-sky-500/30',
        barColor: 'bg-sky-400',
        desc: 'Below optimal 68–72% Cuban / Maduro sweet spot.',
      };
    }
    if (val <= 73) {
      return {
        label: 'PERFECT SWEET SPOT',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/30',
        barColor: 'bg-emerald-500',
        desc: 'Optimal cell aging & oil preservation condition.',
      };
    }
    if (val <= 76) {
      return {
        label: 'HUMID ZONE',
        color: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/30',
        barColor: 'bg-amber-400',
        desc: 'Approaching upper threshold. Watch for mold risk.',
      };
    }
    return {
      label: 'MOLD HAZARD',
      color: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/30',
      barColor: 'bg-rose-500',
      desc: 'High mold & tobacco beetle hatching danger.',
    };
  };

  // Temperature Evaluation
  const getTempStatus = (tempF: number) => {
    if (tempF > 74) {
      return {
        label: 'BEETLE RISK (>74°F)',
        color: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/30',
        barColor: 'bg-rose-500',
      };
    }
    if (tempF < 64) {
      return {
        label: 'SLOW AGING (<64°F)',
        color: 'text-blue-300',
        bg: 'bg-blue-950/40',
        border: 'border-blue-500/30',
        barColor: 'bg-blue-400',
      };
    }
    return {
      label: 'OPTIMAL (65–72°F)',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30',
      barColor: 'bg-emerald-500',
    };
  };

  const rhStatus = getRhStatus(rh);
  const tempStatus = getTempStatus(temp);

  const displayTemp = tempUnit === 'C' ? (((temp - 32) * 5) / 9).toFixed(1) : temp.toFixed(1);
  const tempUnitSymbol = tempUnit === 'C' ? '°C' : '°F';

  // Battery percentage color
  const getBatteryColor = (lvl: number) => {
    if (lvl > 50) return 'text-emerald-400';
    if (lvl > 20) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {/* 1. Relative Humidity Gauge Card */}
      <div className={`bg-slate-900/90 border ${rhStatus.border} rounded-2xl p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${rhStatus.bg} ${rhStatus.color}`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Relative Humidity</span>
              <span className={`block text-[11px] font-bold ${rhStatus.color}`}>{rhStatus.label}</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
            SHT40
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-display tracking-tight text-white">
              {rh.toFixed(1)}
            </span>
            <span className="text-2xl font-bold text-slate-400 font-display">%</span>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <span>Target: 69.0%</span>
          </div>
        </div>

        {/* Progress Bar (0 to 100 with optimal zone indicator) */}
        <div className="space-y-1 mt-4">
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
            {/* Optimal window highlight (65% to 73%) */}
            <div className="absolute left-[65%] right-[27%] top-0 bottom-0 bg-emerald-500/20 z-0" />
            <div
              className={`h-full ${rhStatus.barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(Math.max(rh, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>50%</span>
            <span className="text-emerald-400">Ideal Zone (68-72%)</span>
            <span>90%</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          {rhStatus.desc}
        </p>
      </div>

      {/* 2. Temperature Gauge Card */}
      <div className={`bg-slate-900/90 border ${tempStatus.border} rounded-2xl p-5 shadow-xl relative overflow-hidden transition-all backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${tempStatus.bg} ${tempStatus.color}`}>
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Temperature</span>
              <span className={`block text-[11px] font-bold ${tempStatus.color}`}>{tempStatus.label}</span>
            </div>
          </div>
          {onToggleTempUnit && (
            <button
              onClick={onToggleTempUnit}
              className="text-[11px] font-mono text-slate-300 hover:text-amber-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 transition-colors cursor-pointer"
            >
              Scale: {tempUnit}
            </button>
          )}
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-display tracking-tight text-white">
              {displayTemp}
            </span>
            <span className="text-2xl font-bold text-slate-400 font-display">{tempUnitSymbol}</span>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <span>Threshold: {tempUnit === 'C' ? '23.3°C' : '74.0°F'}</span>
          </div>
        </div>

        {/* Progress Bar (50F to 90F approx) */}
        <div className="space-y-1 mt-4">
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
            <div
              className={`h-full ${tempStatus.barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(Math.max(((temp - 50) / 40) * 100, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>50°F / 10°C</span>
            <span className="text-emerald-400">Aging Range</span>
            <span>90°F / 32°C</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          Keep below 74°F / 23.3°C to safeguard against tobacco beetle hatching.
        </p>
      </div>

      {/* 3. Battery & Power Cell Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Power Cell</span>
              <span className={`block text-[11px] font-bold ${getBatteryColor(battery)}`}>
                {battery > 20 ? 'LiPo Normal' : 'Low Battery Warning'}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
            3.7V LiPo
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-extrabold font-display tracking-tight ${getBatteryColor(battery)}`}>
              {battery}
            </span>
            <span className="text-2xl font-bold text-slate-400 font-display">%</span>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <span>Est. ~{Math.round((battery / 100) * 180)} Days</span>
          </div>
        </div>

        <div className="space-y-1 mt-4">
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full ${battery > 50 ? 'bg-emerald-500' : battery > 20 ? 'bg-amber-500' : 'bg-rose-500'} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(Math.max(battery, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0%</span>
            <span>Sleep Mode Configured</span>
            <span>100%</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          Deep-sleep cycle: {device.sharedAttributes.sleep_interval_min} min telemetry intervals.
        </p>
      </div>

      {/* 4. RF Signal & Telemetry Link Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-sky-400 border border-slate-700">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Wireless Link</span>
              <span className="block text-[11px] font-bold text-sky-400">2.4GHz 802.11b/g/n</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
            ESP32-S3
          </span>
        </div>

        <div className="my-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-display tracking-tight text-white">
              {rssi}
            </span>
            <span className="text-xl font-bold text-slate-400 font-display">dBm</span>
          </div>
          <div className="text-right text-xs font-mono text-slate-400">
            <span className="truncate block max-w-[90px]">{device.clientAttributes.ssid}</span>
          </div>
        </div>

        <div className="space-y-1 mt-4">
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-sky-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(Math.max(((rssi + 100) / 70) * 100, 5), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-100 dBm (Poor)</span>
            <span>-30 dBm (Max)</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          ThingsBoard MQTT/REST gateway synchronization active.
        </p>
      </div>
    </div>
  );
};
