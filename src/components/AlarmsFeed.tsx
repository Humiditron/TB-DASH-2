import React, { useState } from 'react';
import { HumidorAlarm, AlarmSeverity } from '../types';
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCheck, CheckCircle2, Trash2, Filter } from 'lucide-react';

interface AlarmsFeedProps {
  alarms: HumidorAlarm[];
  onAcknowledgeAlarm: (alarmId: string) => void;
  onClearAlarm: (alarmId: string) => void;
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({
  alarms,
  onAcknowledgeAlarm,
  onClearAlarm,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlarms = alarms.filter((alarm) => {
    if (filterSeverity === 'ALL') return true;
    return alarm.severity === filterSeverity;
  });

  const getSeverityBadge = (severity: AlarmSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
          icon: AlertOctagon,
          iconColor: 'text-rose-400',
        };
      case 'MAJOR':
        return {
          bg: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-950/70 text-yellow-300 border-yellow-700/60',
          icon: AlertCircle,
          iconColor: 'text-yellow-400',
        };
    }
  };

  const formatTimestamp = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div id="humid1-alarms-feed" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
              ThingsBoard Alarms & Safety Feed
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated in real-time via Rule Chain filter nodes
            </p>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {['ALL', 'CRITICAL', 'MAJOR', 'WARNING'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alarms List */}
      {filteredAlarms.length === 0 ? (
        <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800/60">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold text-slate-200">No active humidor alarms</p>
          <p className="text-xs text-slate-400">All connected units are operating within safe bounds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlarms.map((alarm) => {
            const badge = getSeverityBadge(alarm.severity);
            const Icon = badge.icon;
            const isAcked = alarm.status === 'ACTIVE_ACK' || alarm.status === 'CLEARED_ACK';

            return (
              <div
                key={alarm.id}
                id={`alarm-item-${alarm.id}`}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition hover:border-slate-700"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                    <Icon className={`w-4 h-4 ${badge.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badge.bg}`}>
                        {alarm.severity}
                      </span>
                      <span className="font-bold text-xs text-slate-200">{alarm.type}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {alarm.deviceName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatTimestamp(alarm.createdTime)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{alarm.message}</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isAcked ? (
                    <button
                      id={`btn-ack-${alarm.id}`}
                      onClick={() => onAcknowledgeAlarm(alarm.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                      title="Acknowledge alarm in ThingsBoard"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ack</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                      Acknowledged
                    </span>
                  )}

                  <button
                    id={`btn-clear-${alarm.id}`}
                    onClick={() => onClearAlarm(alarm.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-700 text-xs font-semibold text-slate-300 hover:text-rose-300 transition cursor-pointer"
                    title="Clear alarm in ThingsBoard"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
