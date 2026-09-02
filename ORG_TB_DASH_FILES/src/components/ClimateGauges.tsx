import React from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { 
  Droplets, 
  Thermometer, 
  Battery, 
  BatteryCharging, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Flame 
} from 'lucide-react';

interface ClimateGaugesProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
}

export const ClimateGauges: React.FC<ClimateGaugesProps> = ({
  device,
  tempUnit,
  onToggleTempUnit,
}) => {
  const { rh, temp, battery } = device.telemetry;

  // Evaluated conditions
  const isOptimalRh = rh >= 65 && rh <= 75;
  const isDryRh = rh < 65;
  const isWetRh = rh > 75;
  const isHotTemp = temp > 75.0; // Beetle hazard ceiling
  const isLowBattery = battery < 20;

  const displayTemp = tempUnit === 'C' ? ((temp - 32) * 5) / 9 : temp;
  const tempUnitLabel = tempUnit === 'C' ? '°C' : '°F';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Relative Humidity Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${
        isOptimalRh
          ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/10'
          : isDryRh
          ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-950/20'
          : 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${
              isOptimalRh ? 'bg-emerald-500/10 text-emerald-400' : isDryRh ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Relative Humidity</h3>
              <p className="text-[11px] text-slate-500 font-mono">Target: 65.0% – 75.0%</p>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
            isOptimalRh
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
              : isDryRh
              ? 'bg-blue-950/80 text-blue-300 border-blue-500/30'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
          }`}>
            {isOptimalRh ? 'OPTIMAL' : isDryRh ? 'LOW / DRY' : 'MOLD RISK'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-2">
          <span className="text-5xl font-extrabold font-mono tracking-tight text-white">
            {rh.toFixed(1)}
          </span>
          <span className="text-2xl font-bold text-slate-400">%</span>
        </div>

        {/* Humidity Comfort Band Indicator */}
        <div className="mt-5 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span>50% Dry</span>
            <span className="text-emerald-400 font-bold">65% – 75% Safe</span>
            <span>85% Mold</span>
          </div>

          <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
            {/* Safe zone highlight (65% to 75% scaled on 50-85 range) */}
            <div 
              className="absolute h-full bg-emerald-500/30 border-x border-emerald-400/50"
              style={{ left: '42.8%', width: '28.5%' }}
            />
            {/* Current marker */}
            <div 
              className={`absolute top-0 bottom-0 w-2 rounded-full -ml-1 transition-all duration-500 ${
                isOptimalRh ? 'bg-emerald-400 ring-2 ring-emerald-300/40' : isDryRh ? 'bg-blue-400' : 'bg-rose-500'
              }`}
              style={{ left: `${Math.max(0, Math.min(100, ((rh - 50) / 35) * 100))}%` }}
            />
          </div>

          <p className="text-xs mt-3 text-slate-400 flex items-center gap-1.5">
            {isOptimalRh ? (
              <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Premium cigar preservation zone.
              </span>
            ) : isDryRh ? (
              <span className="text-blue-400 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Essential oils vaporizing; re-humidify.
              </span>
            ) : (
              <span className="text-rose-400 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Critical: Fungal plume & mold hazard.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 2. Temperature Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${
        isHotTemp
          ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/20'
          : 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-900 border-slate-800 shadow-lg shadow-black/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${isHotTemp ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Ambient Temperature</h3>
              <p className="text-[11px] text-slate-500 font-mono">Alert Limit: &gt; 75.0°F (23.9°C)</p>
            </div>
          </div>

          <button
            onClick={onToggleTempUnit}
            className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            {tempUnitLabel}
          </button>
        </div>

        <div className="flex items-baseline gap-2 my-2">
          <span className="text-5xl font-extrabold font-mono tracking-tight text-white">
            {displayTemp.toFixed(1)}
          </span>
          <span className="text-2xl font-bold text-slate-400">{tempUnitLabel}</span>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80">
          {isHotTemp ? (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
                <Flame className="w-4 h-4" />
                Tobacco Beetle Warning
              </div>
              <p className="text-[11px] text-amber-200/90 leading-tight">
                Temperatures over 75°F activate dormant beetle larvae. Cool humidor immediately.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe thermal zone. Beetle incubation inactive.</span>
            </p>
          )}
        </div>
      </div>

      {/* 3. Battery Capacity Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${
        isLowBattery
          ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
          : 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-900 border-slate-800 shadow-lg shadow-black/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${isLowBattery ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
              <Battery className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">ESP32 Power Cell</h3>
              <p className="text-[11px] text-slate-500 font-mono">Li-Ion 3.7V Telemetry</p>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            isLowBattery
              ? 'bg-rose-950 text-rose-300 border-rose-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {isLowBattery ? 'LOW CHARGE' : 'GOOD'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-2">
          <span className="text-5xl font-extrabold font-mono tracking-tight text-white">
            {battery}
          </span>
          <span className="text-2xl font-bold text-slate-400">%</span>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800/80">
          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isLowBattery ? 'bg-rose-500' : battery > 50 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.max(5, battery)}%` }}
            />
          </div>

          <p className="text-xs text-slate-400">
            {isLowBattery ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Re-charge cell before deep sleep cycles fail.
              </span>
            ) : (
              <span className="text-slate-400">
                Estimated ~{Math.floor(battery * 0.8)} days remaining at {device.sharedAttributes.sleep_interval_sec}s cycle.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
