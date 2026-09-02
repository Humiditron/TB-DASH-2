import React, { useState } from 'react';
import { HumidorAlarm } from '../types';
import { thingsboard } from '../services/thingsboard';
import { 
  Bell, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Check, 
  CheckCheck, 
  Trash2, 
  BellRing, 
  Volume2 
} from 'lucide-react';

interface AlarmsFeedProps {
  alarms: HumidorAlarm[];
}

export const AlarmsFeed: React.FC<AlarmsFeedProps> = ({ alarms }) => {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const handleTogglePush = () => {
    if (!pushEnabled) {
      if ('Notification' in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            setPushEnabled(true);
            setPushMessage('Browser Push Alerts Activated');
            setTimeout(() => setPushMessage(null), 3000);
          } else {
            setPushEnabled(true); // Demo enabled
            setPushMessage('In-App Web Push Notification Active');
            setTimeout(() => setPushMessage(null), 3000);
          }
        });
      } else {
        setPushEnabled(true);
        setPushMessage('Web Push Notification Active');
        setTimeout(() => setPushMessage(null), 3000);
      }
    } else {
      setPushEnabled(false);
    }
  };

  const getSeverityBadge = (severity: HumidorAlarm['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'MAJOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            MAJOR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950/80 text-yellow-300 border border-yellow-500/40">
            <Info className="w-3 h-3 text-yellow-400" />
            WARNING
          </span>
        );
    }
  };

  const getStatusBadge = (status: HumidorAlarm['status']) => {
    switch (status) {
      case 'ACTIVE_UNACK':
        return <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">Active Unack</span>;
      case 'ACTIVE_ACK':
        return <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">Active Ack</span>;
      case 'CLEARED_UNACK':
        return <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20">Cleared Unack</span>;
      case 'CLEARED_ACK':
        return <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">Cleared Ack</span>;
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Humidor Safety Alarms & Rule Engine Feed
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              ThingsBoard Rules
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time triggers for RH out-of-bounds (&lt;65% or &gt;75%), temp ceiling (&gt;75°F), and battery depletion
          </p>
        </div>

        {/* Web Push Notification Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePush}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              pushEnabled
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${pushEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{pushEnabled ? 'Web Push Active' : 'Enable Web Push'}</span>
          </button>
        </div>
      </div>

      {pushMessage && (
        <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{pushMessage}</span>
        </div>
      )}

      {/* Alarms Table / Cards */}
      {alarms.length === 0 ? (
        <div className="text-center py-8 bg-slate-950/40 border border-slate-800/60 rounded-xl text-slate-500 text-xs font-mono">
          No alarms triggered. All humidor climate parameters within safe bounds.
        </div>
      ) : (
        <div className="space-y-3">
          {alarms.map((alarm) => {
            const isUnack = alarm.status.includes('UNACK');
            const isCleared = alarm.status.includes('CLEARED');

            return (
              <div
                key={alarm.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alarm.severity === 'CRITICAL' && !isCleared
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : alarm.severity === 'MAJOR' && !isCleared
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(alarm.severity)}
                    {getStatusBadge(alarm.status)}
                    <span className="font-semibold text-xs text-slate-200">{alarm.deviceName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">• {timeAgo(alarm.createdTime)}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alarm.details}
                  </p>
                </div>

                {/* Alarm Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isUnack && (
                    <button
                      onClick={() => thingsboard.acknowledgeAlarm(alarm.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      title="Acknowledge alarm in ThingsBoard"
                    >
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ack</span>
                    </button>
                  )}

                  {!isCleared && (
                    <button
                      onClick={() => thingsboard.clearAlarm(alarm.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      title="Clear alarm condition"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Clear</span>
                    </button>
                  )}

                  <button
                    onClick={() => thingsboard.deleteAlarm(alarm.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    title="Dismiss alarm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
