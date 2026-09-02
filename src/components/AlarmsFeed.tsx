import React from 'react';
import { HumidorAlarm } from '../types';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Check, 
  Trash2,
  Radio
} from 'lucide-react';

interface AlarmsFeedProps {
  alarms: HumidorAlarm[];
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({ alarms }) => {
  const getSeverityBadge = (severity: HumidorAlarm['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'MAJOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            MAJOR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-yellow-950/80 text-yellow-400 border border-yellow-500/40">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-500/40">
            INFO
          </span>
        );
    }
  };

  const activeAlarms = alarms.filter((a) => a.status.startsWith('ACTIVE'));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              ThingsBoard Alarm & Anomaly Feed
            </h3>
            <p className="text-xs text-slate-400">
              Live climate threshold triggers, power failures, and mold alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {activeAlarms.length} Active Events
          </span>
        </div>
      </div>

      {alarms.length > 0 ? (
        <div className="divide-y divide-slate-800/80 max-h-[300px] overflow-y-auto pr-1">
          {alarms.map((alarm) => {
            const isActive = alarm.status.startsWith('ACTIVE');
            return (
              <div key={alarm.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSeverityBadge(alarm.severity)}</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{alarm.type}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{alarm.details?.message || 'Climate threshold violated'}</p>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alarm.createdTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                      isActive
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {alarm.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-800/60 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
          <p className="font-semibold text-slate-300">All Climates Nominal</p>
          <p className="text-[11px] text-slate-500">No active ThingsBoard threshold alarms triggered.</p>
        </div>
      )}
    </div>
  );
};
