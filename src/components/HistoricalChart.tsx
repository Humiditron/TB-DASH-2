import React, { useState } from 'react';
import { HumidorDevice, TempUnit, TimeRange, TimeSeriesPoint } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, Calendar, Layers, ShieldCheck } from 'lucide-react';

interface HistoricalChartProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ device, tempUnit }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('3d');

  // Filter history points based on selected rolling window
  const getFilteredData = (): TimeSeriesPoint[] => {
    const history = device.history || [];
    if (history.length === 0) return [];

    const now = Date.now();
    let msCutoff = 3 * 24 * 60 * 60 * 1000; // default 3 days
    if (timeRange === '12h') msCutoff = 12 * 60 * 60 * 1000;
    if (timeRange === '24h') msCutoff = 24 * 60 * 60 * 1000;
    if (timeRange === '7d') msCutoff = 7 * 24 * 60 * 60 * 1000;

    const filtered = history.filter((p) => p.timestamp >= now - msCutoff);
    return filtered.length > 0 ? filtered : history.slice(-50);
  };

  const data = getFilteredData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload as TimeSeriesPoint;
      const rhVal = p.rh;
      const isRhSafe = rhVal >= 65 && rhVal <= 75;
      const tempVal = tempUnit === 'C' ? p.tempC : p.temp;

      return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono text-slate-400">
            <span>{p.dateFormatted}</span>
            <span className="text-slate-200 font-bold">{p.timeFormatted}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Relative Humidity:
              </span>
              <span className="font-mono font-bold text-slate-100">{rhVal.toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Temperature:
              </span>
              <span className="font-mono font-bold text-slate-100">
                {tempVal.toFixed(1)}°{tempUnit}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Battery:
              </span>
              <span className="font-mono">{p.battery}%</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded w-full text-center ${
                isRhSafe
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                  : rhVal < 65
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
              }`}
            >
              {isRhSafe ? '✓ Safe 65%–75% RH Band' : rhVal < 65 ? '⚠ Dry Warning' : '⚠ High RH Hazard'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="humid1-historical-chart" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm mb-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              Dual-Axis Climate Telemetry Visualizer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized Relative Humidity (%) & Ambient Temperature (°{tempUnit}) with 65%–75% Safe Band
          </p>
        </div>

        {/* Rolling Window Time Range Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['12h', '24h', '3d', '7d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              id={`btn-range-${range}`}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                timeRange === range
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Safe Zone Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
            <span className="font-semibold text-slate-200">Humidity (% RH - Right Axis)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-500/50" />
            <span className="font-semibold text-slate-200">Temperature (°{tempUnit} - Left Axis)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Shaded Green = Safe 65%–75% RH</span>
        </div>
      </div>

      {/* Recharts Dual-Axis Line Chart */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="timeFormatted"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            {/* Left Axis: Temperature */}
            <YAxis
              yAxisId="left"
              domain={tempUnit === 'C' ? [15, 35] : [60, 90]}
              stroke="#fbbf24"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}°`}
            />

            {/* Right Axis: Humidity (RH %) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[50, 85]}
              stroke="#34d399"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* 65% - 75% RH Safe Zone Shaded Area */}
            <ReferenceArea
              yAxisId="right"
              y1={65}
              y2={75}
              fill="#10b981"
              fillOpacity={0.08}
              stroke="#10b981"
              strokeOpacity={0.25}
              strokeDasharray="2 2"
            />

            {/* Temperature Ceiling Reference Line (75°F) */}
            <ReferenceLine
              yAxisId="left"
              y={tempUnit === 'C' ? 23.9 : 75.0}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: `75° Ceiling`,
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideTopLeft',
              }}
            />

            {/* Synchronized Lines */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rh"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
              name="Relative Humidity"
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey={tempUnit === 'C' ? 'tempC' : 'temp'}
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
              name="Temperature"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
