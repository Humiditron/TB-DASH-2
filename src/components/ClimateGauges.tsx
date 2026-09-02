import React from 'react';
import { HumidorDevice, TempUnit } from '../types';
import { Droplets, Thermometer, BatteryCharging, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ClimateGaugesProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

export const ClimateGauges: React.FC<ClimateGaugesProps> = ({ device, tempUnit }) => {
  const { telemetry } = device;

  // Temperature calculations
  const tempF = telemetry.temp;
  const tempC = ((tempF - 32) * 5) / 9;
  const displayTemp = tempUnit === 'C' ? `${tempC.toFixed(1)}°C` : `${tempF.toFixed(1)}°F`;
  const isTempHazard = tempF > 75.0; // Tobacco beetle risk ceiling

  // Humidity calculations
  const rh = telemetry.rh;
  const isRhIdeal = rh >= 65.0 && rh <= 75.0;
  const isRhDry = rh < 65.0;
  const isRhHigh = rh > 75.0;

  // Gauge bar fill percent for RH (mapping 50% - 85% to 0 - 100%)
  const rhFillPercent = Math.max(0, Math.min(100, ((rh - 50) / 35) * 100));

  // Battery calculations
  const battery = telemetry.battery;
  const isBatteryLow = battery < 20;

  return (
    <div id="humid1-climate-gauges" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. Relative Humidity Card */}
      <div
        id="gauge-card-rh"
        className={`rounded-2xl border p-5 transition-all shadow-sm ${
          isRhIdeal
            ? 'bg-slate-900/90 border-emerald-500/30'
            : isRhDry
            ? 'bg-slate-900/90 border-sky-500/40'
            : 'bg-slate-900/90 border-rose-500/50'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isRhIdeal
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : isRhDry
                  ? 'bg-sky-500/10 text-sky-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Relative Humidity</h3>
              <p className="text-[11px] text-slate-400">Target Range: 65.0% - 75.0%</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              isRhIdeal
                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                : isRhDry
                ? 'bg-sky-950/80 border-sky-700/60 text-sky-300'
                : 'bg-rose-950/80 border-rose-700/60 text-rose-300 animate-pulse'
            }`}
          >
            {isRhIdeal ? 'Ideal Vault Range' : isRhDry ? 'Dry — Seasoning Needed' : 'Mold Hazard'}
          </span>
        </div>

        {/* Big Value Display */}
        <div className="flex items-baseline gap-2 mb-4">
          <span
            className={`text-4xl lg:text-5xl font-black font-mono tracking-tight ${
              isRhIdeal ? 'text-emerald-400' : isRhDry ? 'text-sky-400' : 'text-rose-400'
            }`}
          >
            {rh.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-slate-400">% RH</span>
        </div>

        {/* Comfort Zone Visual Slider */}
        <div className="space-y-1.5">
          <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            {/* 65% - 75% Target Zone Marker (maps to ~42.8% to 71.4% of 50-85 range) */}
            <div
              className="absolute h-full bg-emerald-500/25 border-x border-emerald-400/50"
              style={{ left: '42.8%', width: '28.6%' }}
              title="Safe Zone: 65% - 75%"
            />
            {/* Current Value Needle / Bar */}
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                isRhIdeal ? 'bg-emerald-400' : isRhDry ? 'bg-sky-400' : 'bg-rose-500'
              }`}
              style={{ width: `${rhFillPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>50% Dry</span>
            <span className="text-emerald-400 font-bold">65%–75% Ideal</span>
            <span>85% Wet</span>
          </div>
        </div>
      </div>

      {/* 2. Temperature Card */}
      <div
        id="gauge-card-temp"
        className={`rounded-2xl border p-5 transition-all shadow-sm ${
          isTempHazard
            ? 'bg-slate-900/90 border-amber-500/50'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isTempHazard ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-200'
              }`}
            >
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ambient Temperature</h3>
              <p className="text-[11px] text-slate-400">Beetle Ceiling: 75.0°F (23.9°C)</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              isTempHazard
                ? 'bg-amber-950/80 border-amber-700/60 text-amber-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isTempHazard ? 'Warning: > 75°F' : 'Normal Range'}
          </span>
        </div>

        {/* Big Value Display */}
        <div className="flex items-baseline gap-2 mb-4">
          <span
            className={`text-4xl lg:text-5xl font-black font-mono tracking-tight ${
              isTempHazard ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {tempUnit === 'C' ? tempC.toFixed(1) : tempF.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-slate-400">°{tempUnit}</span>
        </div>

        {/* Temperature Alert Banner or Safe Indicator */}
        <div className="pt-1">
          {isTempHazard ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/50 border border-amber-800/60 text-amber-300 text-xs font-medium">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Tobacco beetle hatching risk elevated above 75.0°F. Cool humidor.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Optimal aging temperature maintained.</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Battery & Power State */}
      <div
        id="gauge-card-battery"
        className={`rounded-2xl border p-5 transition-all shadow-sm ${
          isBatteryLow
            ? 'bg-slate-900/90 border-rose-500/50'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                isBatteryLow ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-emerald-400'
              }`}
            >
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Battery Power</h3>
              <p className="text-[11px] text-slate-400">RTC Deep Sleep Cycle</p>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              isBatteryLow
                ? 'bg-rose-950/80 border-rose-700/60 text-rose-300 animate-bounce'
                : 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
            }`}
          >
            {isBatteryLow ? 'Low Power (<20%)' : 'Healthy'}
          </span>
        </div>

        {/* Big Value Display */}
        <div className="flex items-baseline gap-2 mb-4">
          <span
            className={`text-4xl lg:text-5xl font-black font-mono tracking-tight ${
              isBatteryLow ? 'text-rose-400' : 'text-slate-100'
            }`}
          >
            {battery}
          </span>
          <span className="text-xl font-bold text-slate-400">%</span>
        </div>

        {/* Battery Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isBatteryLow
                  ? 'bg-rose-500 animate-pulse'
                  : battery < 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${battery}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Sleep: {device.sharedAttributes.sleep_interval_sec}s</span>
            <span>Est. {Math.round((battery / 100) * 180)} days left</span>
          </div>
        </div>
      </div>
    </div>
  );
};
