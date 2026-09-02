import React, { useState } from 'react';
import { HumidorDevice, TempUnit } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Calendar, Activity, Sliders, RefreshCw, ZoomIn } from 'lucide-react';

interface HistoricalChartProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

type TimeRange = '24h' | '7d' | '30d';

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  device,
  tempUnit,
}) => {
  const [range, setRange] = useState<TimeRange>('24h');
  const [showRh, setShowRh] = useState(true);
  const [showTemp, setShowTemp] = useState(true);

  // Filter history according to selected range
  const history = device.history || [];
  const now = Date.now();
  const rangeMs =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

  const filteredHistory = history.filter((pt) => now - pt.timestamp <= rangeMs);

  const displayHistory = (filteredHistory.length > 0 ? filteredHistory : history).map((pt) => ({
    ...pt,
    displayTemp: tempUnit === 'C' ? pt.tempC : pt.temp,
  }));

  const tempSymbol = tempUnit === 'C' ? '°C' : '°F';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Dual-Axis Climate Telemetry History
            </h3>
            <p className="text-xs text-slate-400">
              Synchronized Relative Humidity (%) & Temperature ({tempSymbol}) logging stream
            </p>
          </div>
        </div>

        {/* Range & Series Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Series filters */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setShowRh(!showRh)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                showRh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>RH %</span>
            </button>
            <button
              onClick={() => setShowTemp(!showTemp)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                showTemp ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Temp ({tempSymbol})</span>
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['24h', '7d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg font-medium font-mono uppercase transition-all cursor-pointer ${
                  range === r
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rhGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey={range === '24h' ? 'timeFormatted' : 'dateFormatted'}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />

            {/* Left Y-Axis: Humidity */}
            <YAxis
              yAxisId="rh"
              domain={[55, 85]}
              stroke="#f59e0b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Right Y-Axis: Temperature */}
            <YAxis
              yAxisId="temp"
              orientation="right"
              domain={tempUnit === 'C' ? [15, 30] : [60, 85]}
              stroke="#38bdf8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#f8fafc',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'rh') return [`${Number(value).toFixed(1)} %`, 'Humidity'];
                if (name === 'displayTemp') return [`${Number(value).toFixed(1)} ${tempSymbol}`, 'Temperature'];
                return [value, name];
              }}
              labelFormatter={(label) => `Logged: ${label}`}
            />

            {/* Ideal Humidor Relative Humidity safe limits (65% to 72%) */}
            <ReferenceLine yAxisId="rh" y={72} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.4} />
            <ReferenceLine yAxisId="rh" y={65} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.4} />

            {showRh && (
              <Area
                yAxisId="rh"
                type="monotone"
                dataKey="rh"
                name="rh"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#rhGradient)"
              />
            )}

            {showTemp && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="displayTemp"
                name="displayTemp"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend / Safe Zones */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="text-slate-300 font-medium">Relative Humidity (Left Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-sky-400" />
            <span className="text-slate-300 font-medium">Temperature (Right Axis)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Optimal Cuban RH Envelope: 65% – 72%</span>
        </div>
      </div>
    </div>
  );
};
