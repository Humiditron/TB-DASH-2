import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceArea, 
  ReferenceLine, 
  CartesianGrid 
} from 'recharts';
import { HumidorDevice, TempUnit, HistoricalTelemetryPoint } from '../types';
import { thingsboard } from '../services/thingsboard';
import { Calendar, TrendingUp, Sparkles } from 'lucide-react';

interface HistoricalChartProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

type RangeOption = '12h' | '24h' | '3d' | '7d';

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  device,
  tempUnit,
}) => {
  const [range, setRange] = useState<RangeOption>('3d');
  const [historyData, setHistoryData] = useState<HistoricalTelemetryPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let hours = 72;
    if (range === '12h') hours = 12;
    if (range === '24h') hours = 24;
    if (range === '3d') hours = 72;
    if (range === '7d') hours = 168;

    setLoading(true);
    thingsboard.getHistory(device.id, hours).then((data) => {
      setHistoryData(data);
      setLoading(false);
    });
  }, [device.id, range]);

  const convertTemp = (tempF: number) => {
    if (tempUnit === 'C') {
      return Number((((tempF - 32) * 5) / 9).toFixed(1));
    }
    return tempF;
  };

  const chartData = historyData.map((d) => ({
    ...d,
    tempDisplay: convertTemp(d.temp),
  }));

  const tempUnitLabel = tempUnit === 'C' ? '°C' : '°F';
  const beetleHazardThreshold = tempUnit === 'C' ? 23.9 : 75.0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Dual-Axis Climate Telemetry Time-Series
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Synchronized
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Plotting Relative Humidity (<span className="text-emerald-400 font-semibold">RH %</span>) vs. Temperature (<span className="text-amber-400 font-semibold">Temp {tempUnitLabel}</span>)
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['12h', '24h', '3d', '7d'] as RangeOption[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
                range === r
                  ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            Loading historical telemetry...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <span>No historical telemetry recorded within the selected window.</span>
            <span className="text-[11px] text-slate-600">Telemetry points will plot automatically as ThingsBoard collects data.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

              <XAxis 
                dataKey="timeLabel" 
                stroke="#64748b" 
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickMargin={8}
              />

              {/* Left Y Axis: Temperature */}
              <YAxis 
                yAxisId="left"
                stroke="#f59e0b"
                tick={{ fontSize: 11, fill: '#f59e0b' }}
                domain={tempUnit === 'C' ? [15, 30] : [60, 85]}
                unit={tempUnitLabel}
              />

              {/* Right Y Axis: Relative Humidity */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fontSize: 11, fill: '#10b981' }}
                domain={[50, 85]}
                unit="%"
              />

              <Tooltip 
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}
                formatter={(value: any, name: string) => {
                  if (name === 'Humidity') return [`${value}% RH`, 'Relative Humidity'];
                  if (name === 'Temperature') return [`${value} ${tempUnitLabel}`, 'Temperature'];
                  return [value, name];
                }}
              />

              {/* Shaded Reference Area: Ideal 65% - 75% RH Comfort Zone */}
              <ReferenceArea
                yAxisId="right"
                y1={65}
                y2={75}
                fill="#10b981"
                fillOpacity={0.08}
                stroke="#10b981"
                strokeOpacity={0.2}
              />

              {/* Reference Line: 75°F Beetle Hazard Warning */}
              <ReferenceLine
                yAxisId="left"
                y={beetleHazardThreshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ 
                  value: `Max ${beetleHazardThreshold}${tempUnitLabel}`, 
                  fill: '#ef4444', 
                  fontSize: 10, 
                  position: 'insideTopLeft' 
                }}
              />

              {/* Temperature Line (Left Axis) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tempDisplay"
                name="Temperature"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#090d16', strokeWidth: 2 }}
              />

              {/* Humidity Line (Right Axis) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rh"
                name="Humidity"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#090d16', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Guide Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">RH % (Right Axis)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-medium">Temp {tempUnitLabel} (Left Axis)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-5 rounded bg-emerald-500/20 border border-emerald-400/40" />
            <span className="text-slate-400">65%–75% RH Safe Band</span>
          </div>
        </div>

        <span className="text-slate-500 font-mono text-[11px]">
          Sample rate: 900s interval
        </span>
      </div>
    </div>
  );
};
